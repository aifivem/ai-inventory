import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { useLang } from "../../lib/lang";
import { useAppDispatch, useAppSelector } from "../../store";
import { toastRemoved, type Toast } from "../../store/inventory";

function ToastCard({ toast }: { toast: Toast }) {
  const t = useLang();
  const dispatch = useAppDispatch();
  useEffect(() => {
    const timer = setTimeout(() => dispatch(toastRemoved(toast.id)), 3000);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);
  return (
    <div role="status" className="flex w-[36vh] animate-rise items-center gap-[1.2vh] overflow-hidden rounded-[1vh] border border-line bg-panel py-[1.2vh] pl-0 pr-[1.4vh]">
      <span className="h-[3.2vh] w-[0.4vh] shrink-0 rounded-r-full bg-danger" />
      <FontAwesomeIcon icon={faCircleExclamation} className="text-[1.8vh] text-danger" />
      <span className="text-[1.3vh] text-text-2">{t(toast.text)}</span>
    </div>
  );
}

/** Error toasts and the item-use progress: shown with or without the inventory open. */
export function Overlay() {
  const t = useLang();
  const toasts = useAppSelector((state) => state.inventory.toasts);
  const progress = useAppSelector((state) => state.inventory.progress);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[12vh] z-[95] flex flex-col items-center gap-[0.8vh]">
      {progress && (
        <div key={progress.startedAt} className="flex w-[32vh] animate-rise flex-col gap-[0.8vh] rounded-[1vh] border border-line bg-panel p-[1.2vh]">
          <span className="text-[1.3vh] font-medium text-text-2">{t("UI_USING", progress.label)}</span>
          <div className="h-[0.5vh] overflow-hidden rounded-full bg-raised">
            <div className="h-full origin-left rounded-full bg-accent" style={{ animation: `progress-fill ${progress.time}ms linear both` }} />
          </div>
        </div>
      )}
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
