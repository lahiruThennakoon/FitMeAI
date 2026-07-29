import Link from "next/link";

type Props = {
  /** Path with the next `show` value already applied. */
  href: string;
  shown: number;
  label?: string;
};

/**
 * A link, not a button: paging state lives in the URL so the longer list
 * survives a refresh and works without client JS.
 */
export function ShowMoreLink({ href, shown, label = "entries" }: Props) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">
        Showing the {shown} most recent {label}.
      </span>
      <Link
        href={href}
        scroll={false}
        prefetch={false}
        className="shrink-0 font-medium text-brand-blue underline decoration-dotted"
      >
        Show more
      </Link>
    </div>
  );
}
