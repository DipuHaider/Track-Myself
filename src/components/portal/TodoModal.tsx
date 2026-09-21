"use client";

import Modal from "@/components/shared/Modal";
import TodoList from "@/components/portal/TodoList";

export default function TodoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="To-Do list">
      <TodoList variant="plain" />
    </Modal>
  );
}
