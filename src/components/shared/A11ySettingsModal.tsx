"use client";

import Modal from "@/components/shared/Modal";
import A11ySettingsBody from "@/components/shared/A11ySettingsBody";

export default function A11ySettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Accessibility & display">
      <div className="p-5">
        <A11ySettingsBody />
      </div>
    </Modal>
  );
}
