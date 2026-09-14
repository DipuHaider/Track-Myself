"use client";

/**
 * A Word *text* editor, deliberately not a Word editor.
 *
 * It opens the zip, edits the text of whole paragraphs in word/document.xml, and
 * writes the archive back. Everything it does not touch — styles, numbering,
 * images, headers, footers, tables — is repacked byte-for-byte, which is what
 * makes the round-trip safe on real third-party files.
 *
 * The deliberate limit: a visual word is routinely split across several <w:r>
 * runs (rsid churn, spell-check state, a language switch), so "the text of this
 * paragraph" is the smallest unit that can be edited without run-splitting logic.
 * Replacing it keeps the paragraph's style and the first run's character
 * formatting, and loses formatting that varied *inside* the paragraph — a bold
 * word mid-sentence comes back plain. The UI says so rather than hiding it.
 *
 * The docx package cannot help here: it is write-only and has no parser, so this
 * uses the browser's own DOMParser/XMLSerializer, which round-trips namespaces
 * faithfully and costs no dependency.
 */

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const DOC_PART = "word/document.xml";

export type DocxParagraph = {
  index: number;
  text: string;
  style: string;
  bold: boolean;
  italic: boolean;
  /** Word stores half-points; 24 means 12pt. 0 when the run inherits. */
  sizeHalfPt: number;
  listItem: boolean;
  inTable: boolean;
};

export type DocxSession = {
  paragraphs: DocxParagraph[];
  setText: (index: number, text: string) => void;
  duplicate: (index: number) => void;
  isDirty: () => boolean;
  toBlob: () => Promise<Blob>;
  partNames: string[];
};

function first(el: Element, tag: string): Element | null {
  return el.getElementsByTagNameNS(W, tag).item(0);
}

function describe(p: Element, index: number): DocxParagraph {
  const texts = p.getElementsByTagNameNS(W, "t");
  let text = "";
  for (let i = 0; i < texts.length; i++) text += texts.item(i)?.textContent ?? "";

  const pPr = first(p, "pPr");
  const style = pPr ? (first(pPr, "pStyle")?.getAttributeNS(W, "val") ?? "") : "";
  const listItem = Boolean(pPr && first(pPr, "numPr"));

  const rPr = first(p, "rPr");
  const sz = rPr ? first(rPr, "sz")?.getAttributeNS(W, "val") : null;

  let inTable = false;
  for (let n: Node | null = p.parentNode; n; n = n.parentNode) {
    if ((n as Element).localName === "tbl") { inTable = true; break; }
  }

  return {
    index,
    text,
    style,
    bold: Boolean(rPr && first(rPr, "b")),
    italic: Boolean(rPr && first(rPr, "i")),
    sizeHalfPt: sz ? Number(sz) : 0,
    listItem,
    inTable,
  };
}

export async function openDocx(bytes: ArrayBuffer | Uint8Array): Promise<DocxSession> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);

  const part = zip.file(DOC_PART);
  if (!part) throw new Error("That file is not a Word document — word/document.xml is missing.");

  const xml = await part.async("string");
  const xmlDoc = new DOMParser().parseFromString(xml, "application/xml");
  if (xmlDoc.getElementsByTagName("parsererror").length) {
    throw new Error("That document's XML could not be parsed.");
  }

  let nodes = Array.from(xmlDoc.getElementsByTagNameNS(W, "p"));
  let dirty = false;

  const build = () => nodes.map((p, i) => describe(p, i));
  const session: DocxSession = {
    paragraphs: build(),
    partNames: Object.keys(zip.files).filter((n) => n.endsWith(".xml") || n.startsWith("word/media/")),

    setText(index, text) {
      const p = nodes[index];
      if (!p) return;

      const texts = p.getElementsByTagNameNS(W, "t");
      if (texts.length === 0) {
        /* An empty paragraph has no run to write into, so give it one. */
        const r = xmlDoc.createElementNS(W, "w:r");
        const t = xmlDoc.createElementNS(W, "w:t");
        t.setAttributeNS(XML_NS, "xml:space", "preserve");
        t.textContent = text;
        r.appendChild(t);
        p.appendChild(r);
      } else {
        const head = texts.item(0)!;
        head.setAttributeNS(XML_NS, "xml:space", "preserve");
        head.textContent = text;
        /* The rest of the runs keep their formatting but carry no text, so the
           paragraph reads as one string without deleting any run structure. */
        for (let i = 1; i < texts.length; i++) texts.item(i)!.textContent = "";
      }

      dirty = true;
      session.paragraphs = build();
    },

    duplicate(index) {
      const p = nodes[index];
      if (!p) return;
      const copy = p.cloneNode(true) as Element;
      const texts = copy.getElementsByTagNameNS(W, "t");
      for (let i = 0; i < texts.length; i++) texts.item(i)!.textContent = "";
      p.parentNode?.insertBefore(copy, p.nextSibling);
      nodes = Array.from(xmlDoc.getElementsByTagNameNS(W, "p"));
      dirty = true;
      session.paragraphs = build();
    },

    isDirty: () => dirty,

    async toBlob() {
      zip.file(DOC_PART, new XMLSerializer().serializeToString(xmlDoc));
      return zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
    },
  };

  return session;
}
