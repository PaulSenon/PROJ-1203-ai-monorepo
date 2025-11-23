import { cva } from "class-variance-authority";
import { AnimatePresence, motion, type Variants } from "motion/react";
import {
  Children,
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import type { ButtonGroup } from "../ui/button-group";

type CollapsibleButtonGroupState = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  orientation: "horizontal" | "vertical";
};
const CollapsibleButtonGroupContext =
  createContext<CollapsibleButtonGroupState | null>(null);

const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal: "",
        vertical: "flex-col",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
);

/**
 * This is a replacement of shadcn/ui's ButtonGroup component that supports collapsing.
 *
 * @example
 * By default, you can simply use it without the collapsing functionality by just
 * passing Button children.
 * ```tsx
 * <CollapsibleButtonGroup>
 *   <Button>1</Button>
 *   <Button>2</Button>
 *   <Button>3</Button>
 * </CollapsibleButtonGroup>
 * ```
 *
 * @example
 * Or you can wrap some button in CollapsibleButtonGroupContent to make them collapse.
 * ```tsx
 * <CollapsibleButtonGroup>
 *   <Button>1</Button>
 *
 *   <CollapsibleButtonGroup.CollapsibleContent>
 *     <Button>2</Button>
 *     <Button>3</Button>
 *   </CollapsibleButtonGroup.CollapsibleContent>
 * </CollapsibleButtonGroup>
 * ```
 *
 * @example
 * You can manually control the collapsed state by either using
 * the CollapsibleButtonGroup.TriggerButton
 * ```tsx
 * <CollapsibleButtonGroup>
 *   <CollapsibleButtonGroup.TriggerButton>
 *     <Button>toggle</Button>
 *   </CollapsibleButtonGroup.TriggerButton>
 *
 *   <Button>1</Button>
 *   <CollapsibleButtonGroup.CollapsibleContent>
 *     <Button>2</Button>
 *     <Button>3</Button>
 *   </CollapsibleButtonGroup.CollapsibleContent>
 * </CollapsibleButtonGroup>
 * ```
 *
 * @example
 * You can manually control the collapsed state by either using
 * the CollapsibleButtonGroup.TriggerInvisible.
 * ```tsx
 * // custom state management
 * const [collapsed, setCollapsed] = useState(true);
 * <CollapsibleButtonGroup>
 *   <CollapsibleButtonGroup.TriggerInvisible collapsed={collapsed} />
 *
 *   <Button>1</Button>
 *   <CollapsibleButtonGroup.CollapsibleContent>
 *     <Button>2</Button>
 *     <Button>3</Button>
 *   </CollapsibleButtonGroup.CollapsibleContent>
 * </CollapsibleButtonGroup>
 * ```
 */
export function CollapsibleButtonGroup({
  children,
  collapsed = false,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof ButtonGroup> & {
  collapsed?: boolean;
  defaultCollapsed?: boolean;
}) {
  const context = useContext(CollapsibleButtonGroupContext);
  const needsProvider = !context;

  return needsProvider ? (
    <CollapsibleButtonGroupProvider
      defaultCollapsed={collapsed}
      orientation={orientation ?? "horizontal"}
    >
      <InternalButtonGroupContent
        collapsed={collapsed}
        orientation={orientation}
        {...props}
      >
        {children}
      </InternalButtonGroupContent>
    </CollapsibleButtonGroupProvider>
  ) : (
    <InternalButtonGroupContent
      collapsed={collapsed}
      orientation={orientation}
      {...props}
    >
      {children}
    </InternalButtonGroupContent>
  );
}
function InternalButtonGroupContent({
  orientation,
  className,
  children,
  collapsed,
  ...props
}: React.ComponentProps<typeof ButtonGroup> & {
  collapsed?: boolean;
}) {
  const { collapsed: _collapsed, setCollapsed } =
    useCollapsibleButtonGroupState();

  useEffect(() => {
    if (collapsed !== undefined) {
      setCollapsed(collapsed);
    }
  }, [collapsed, setCollapsed]);

  const showCollapsibleButtons = !_collapsed;

  return (
    <div
      className={cn(
        buttonGroupVariants({ orientation }),
        className,
        !showCollapsibleButtons && "bg-transparent backdrop-blur-none"
      )}
      {...props}
    >
      {children}
    </div>
  );
}
CollapsibleButtonGroup.Provider = CollapsibleButtonGroupProvider;
CollapsibleButtonGroup.TriggerButton = CollapsibleTriggerButton;
CollapsibleButtonGroup.TriggerInvisible = CollapsibleTriggerInvisible;
CollapsibleButtonGroup.CollapsibleContent = CollapsibleContent;
CollapsibleButtonGroup.useState = useCollapsibleButtonGroupState;

function CollapsibleButtonGroupProvider({
  children,
  defaultCollapsed = false,
  orientation = "horizontal",
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  orientation?: "horizontal" | "vertical";
}) {
  const [_collapsed, _setCollapsed] = useState(defaultCollapsed);

  const setCollapsed: Dispatch<SetStateAction<boolean>> = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === "function") {
        _setCollapsed((prev) => value(prev));
      } else {
        _setCollapsed(value);
      }
    },
    []
  );

  const state = useMemo(
    () =>
      ({
        collapsed: _collapsed,
        setCollapsed,
        orientation: orientation ?? "horizontal",
      }) satisfies CollapsibleButtonGroupState,
    [_collapsed, setCollapsed, orientation]
  );

  return (
    <CollapsibleButtonGroupContext.Provider value={state}>
      {children}
    </CollapsibleButtonGroupContext.Provider>
  );
}

function useCollapsibleButtonGroupState() {
  const context = useContext(CollapsibleButtonGroupContext);
  if (!context) {
    throw new Error(
      "useCollapsibleButtonGroupState must be used within a CollapsibleButtonGroup"
    );
  }
  return context;
}

function CollapsibleTriggerButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { setCollapsed } = useCollapsibleButtonGroupState();
  return (
    <Button {...props} onClick={() => setCollapsed((prev) => !prev)}>
      {children}
    </Button>
  );
}

function CollapsibleTriggerInvisible({ collapsed }: { collapsed: boolean }) {
  const { setCollapsed } = useCollapsibleButtonGroupState();
  useEffect(() => {
    setCollapsed(collapsed);
  }, [collapsed, setCollapsed]);
  return null;
}

const variants: Variants = {
  horizontal: {
    width: "auto",
    opacity: 1,
    transition: {
      type: "spring",
      bounce: 0,
      duration: 0.15,
    },
  },
  horizontalHidden: {
    width: 0,
    opacity: 0,
    transition: {
      type: "spring",
      bounce: 0,
      duration: 0.2,
    },
  },
  vertical: {
    height: "auto",
    opacity: 1,
    transition: {
      type: "spring",
      bounce: 0,
      duration: 0.15,
    },
  },
  verticalHidden: {
    height: 0,
    opacity: 0,
    transition: {
      type: "spring",
      bounce: 0,
      duration: 0.2,
    },
  },
};

function CollapsibleContent({ children }: { children: React.ReactNode }) {
  const { collapsed, orientation } = useCollapsibleButtonGroupState();
  const showCollapsibleButtons = !collapsed;

  const isVertical = orientation === "vertical";

  return (
    <AnimatePresence initial={false} mode="sync">
      {showCollapsibleButtons &&
        Children.map(children, (child, index) => (
          <motion.div
            animate={isVertical ? "vertical" : "horizontal"}
            className="overflow-hidden"
            exit={isVertical ? "verticalHidden" : "horizontalHidden"}
            initial={isVertical ? "verticalHidden" : "horizontalHidden"}
            key={`collapsible-${index}`}
            layout
            transition={{
              delay: index * 0.05,
            }}
            // Adjust delay based on index for stagger effect if needed, though variants handle per-prop transition
            variants={variants}
          >
            {child}
          </motion.div>
        ))}
    </AnimatePresence>
  );
}
