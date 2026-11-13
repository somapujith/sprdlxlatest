// Small presentational pieces shared by the project index, the detail dialog
// and the case-study pages.

/**
 * Square project mark: the project's logo when it has one, otherwise its
 * monogram (a main letter plus an optional small suffix, e.g. "S" + "AI").
 */
export function ProjectMark({ project, className = "" }) {
  const image = project?.mark ?? project?.logo ?? null;
  const wide = !project?.mark && !!project?.logo && !!project?.wideMark;
  const classes = ["project-mark", wide ? "is-wide" : "", className].filter(Boolean).join(" ");
  const [main = "", small = ""] = project?.monogram ?? [];

  return (
    <span className={classes} aria-hidden="true">
      {image ? (
        <img src={image} alt="" width={96} height={96} loading="lazy" decoding="async" />
      ) : (
        <span className="project-monogram">
          {main}
          {small ? <span>{small}</span> : null}
        </span>
      )}
    </span>
  );
}

const STATUS_CLASS = {
  Active: "active",
  Growing: "growing",
};

/** Status pill with a coloured light: Active, Growing or In development. */
export function ProjectStatus({ status }) {
  const modifier = STATUS_CLASS[status] ?? "development";
  return (
    <span className={`project-status is-${modifier}`}>
      <span className="status-light" aria-hidden="true" />
      {status}
    </span>
  );
}
