import { useEffect } from "react";

export default function useModalReset(open, reset) {
  useEffect(() => {
    if (!open) {
      return;
    }

    reset?.();
  }, [open, reset]);
}
