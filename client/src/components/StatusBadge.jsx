import { statusMeta, toneClasses } from "../lib/requestStatus.js";

/**
 * The one status pill in the app.
 *
 * Every screen that shows a workflow state renders this, so Accepted, Rejected, Cancelled,
 * Pending and In Progress look the same in the directory, on a profile and in the request lists.
 * Pass either a `status` string or an already-built descriptor from requestStatus.js as `meta` -
 * the action helpers there return one, so a button and its pill cannot disagree.
 */
const StatusBadge = ({ status, meta, as = "recipient", size = "md", className = "" }) => {
    const resolved = meta || statusMeta(status, as);
    if (!resolved?.label) return null;

    const { label, Icon } = resolved;
    const classes = resolved.classes || toneClasses(resolved.tone);
    const sizing = size === "sm"
        ? "px-2.5 py-1 text-[0.7rem] gap-1.5"
        : "px-3 py-1.5 text-xs gap-2";

    return (
        <span className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wide whitespace-nowrap ${sizing} ${classes.pill} ${className}`}>
            {Icon && <Icon className={size === "sm" ? "size-3" : "size-3.5"} />}
            {label}
        </span>
    );
};

/**
 * A pill with the sentence that goes with it. Used where there is room to explain - profile pages,
 * the action box under a request - while the bare badge is for cards and table rows.
 */
export const StatusNote = ({ status, meta, as = "recipient", className = "" }) => {
    const resolved = meta || statusMeta(status, as);
    if (!resolved?.label) return null;
    const classes = resolved.classes || toneClasses(resolved.tone);

    return (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border ${classes.pill} ${className}`}>
            {resolved.Icon && <resolved.Icon className="size-5 shrink-0 mt-0.5" />}
            <div className="min-w-0">
                <p className="text-sm font-bold">{resolved.label}</p>
                {resolved.description && (
                    <p className="text-xs mt-0.5 opacity-90">{resolved.description}</p>
                )}
            </div>
        </div>
    );
};

export default StatusBadge;
