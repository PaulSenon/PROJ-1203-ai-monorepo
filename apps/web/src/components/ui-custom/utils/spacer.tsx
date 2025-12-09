/**
 * For when you need to reserve space of an element without hardcoding a spacer.
 * You wrap your component again with this and you get the same layout footprint,
 * with the same layout behavior of your component. So it makes harder to forget to
 * update a spacer when you change the layout of your component.
 *
 * We use visibility: hidden to hint the browser to skip rendering the element.
 * (only compute the layout (position/spacing), not the rendering (visual))
 *
 * @example
 * ```tsx
 * <div></div>
 *   <MyComponent className="fixed top-0"/>
 *   <SpacerFrom><MyComponent /></SpacerFrom>
 *   <div>
 *     <p>Hello</p>
 *     <p>World</p>
 *   </div>
 * </div>
 *
 * ```
 */
export function SpacerFrom({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none invisible"
      role="presentation"
    >
      {children}
    </div>
  );
}
