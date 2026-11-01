import JetraArriving from "./jetra-arriving";

/**
 * The blog notice, faded up on arrival.
 *
 * The fade was a framer-motion variant, which made this a Client Component
 * and shipped the animation library for one opacity-and-offset transition.
 * The same entrance is a CSS animation now (tw-animate-css), rendered on
 * the server, and skipped for visitors who ask for reduced motion. It runs
 * at the sheet duration with no delay: a second-long fade held back 300ms
 * read as the page loading slowly.
 */
function BlogContent() {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-[var(--dur-sheet)] ease-[var(--ease-out)] motion-reduce:animate-none">
      <JetraArriving />
    </div>
  );
}

export default BlogContent;
