import { ACTIVE_GROUP, ACTIVE_PREFIX, APPLICATION_STATUSES, MAIN_STATUSES } from "@/constants/applicationStatus";

const STAGES = APPLICATION_STATUSES.filter((s) => s.startsWith(ACTIVE_PREFIX));

export default function StatusOptions() {
  return (
    <>
      {MAIN_STATUSES.map((s) =>
        s === ACTIVE_GROUP ? (
          <optgroup key={s} label="Active (in process)">
            {STAGES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </optgroup>
        ) : (
          <option key={s} value={s}>{s}</option>
        ),
      )}
    </>
  );
}
