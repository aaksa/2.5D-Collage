import { AbsoluteFill } from "remotion";

// A compact browser toolbar across the top of frame, as if the film were
// playing in a local dev page: window buttons, back and forward, and a
// centred address field.

export const BROWSER_BAR_HEIGHT = 68;

const SANS = "Inter, sans-serif";
const ICON = "rgba(235,235,240,0.55)";

const Chevron: React.FC<{ flip?: boolean; dim?: boolean }> = ({
  flip,
  dim,
}) => (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    style={{
      transform: flip ? "scaleX(-1)" : undefined,
      opacity: dim ? 0.45 : 1,
    }}
  >
    <path
      d="M15 5l-7 7 7 7"
      fill="none"
      stroke={ICON}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Reload: React.FC = () => (
  <svg width={18} height={18} viewBox="0 0 24 24">
    <path
      d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.2h-4.2"
      fill="none"
      stroke={ICON}
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Info: React.FC = () => (
  <svg width={17} height={17} viewBox="0 0 24 24">
    <circle cx={12} cy={12} r={9} fill="none" stroke={ICON} strokeWidth={2} />
    <path
      d="M12 11v6M12 7.6v.1"
      stroke={ICON}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </svg>
);

const Plus: React.FC = () => (
  <svg width={20} height={20} viewBox="0 0 24 24">
    <path
      d="M12 5v14M5 12h14"
      stroke={ICON}
      strokeWidth={2.1}
      strokeLinecap="round"
    />
  </svg>
);

const Tabs: React.FC = () => (
  <svg width={20} height={20} viewBox="0 0 24 24">
    <rect
      x={3.5}
      y={6.5}
      width={13}
      height={13}
      rx={2.5}
      fill="none"
      stroke={ICON}
      strokeWidth={2}
    />
    <path
      d="M8 3.5h10a2.5 2.5 0 0 1 2.5 2.5v10"
      fill="none"
      stroke={ICON}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
);

const Light: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      width: 14,
      height: 14,
      borderRadius: 7,
      background: color,
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.25)",
    }}
  />
);

export const BrowserChrome: React.FC<{ url: string }> = ({ url }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: BROWSER_BAR_HEIGHT,
        display: "flex",
        alignItems: "center",
        padding: "0 26px",
        background: "linear-gradient(#2a2a2d, #232326)",
        borderBottom: "1px solid rgba(0,0,0,0.6)",
        boxShadow:
          "inset 0 -1px 0 rgba(255,255,255,0.04), 0 6px 24px rgba(0,0,0,0.35)",
        fontFamily: SANS,
      }}
    >
      <div style={{ display: "flex", gap: 9 }}>
        <Light color="#ff5f57" />
        <Light color="#febc2e" />
        <Light color="#28c840" />
      </div>
      <div style={{ display: "flex", gap: 14, marginLeft: 34 }}>
        <Chevron />
        <Chevron flip dim />
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <div
          style={{
            width: 620,
            height: 38,
            borderRadius: 10,
            background: "rgba(255,255,255,0.075)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
          }}
        >
          <Info />
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: "0.01em",
              color: "rgba(245,245,247,0.9)",
            }}
          >
            {url}
          </div>
          <Reload />
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, marginLeft: "auto" }}>
        <Plus />
        <Tabs />
      </div>
    </div>
  </AbsoluteFill>
);

// An overlay scrollbar on the right, below the toolbar: the thumb moves
// down the page as the film plays, as if it were being scrolled through.
const SCROLL_INSET = 6; // from the edges of the page area
const THUMB = 0.16; // thumb length, as a fraction of the track

export const ScrollIndicator: React.FC<{ progress: number }> = ({
  progress,
}) => {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: BROWSER_BAR_HEIGHT + SCROLL_INSET,
          bottom: SCROLL_INSET,
          right: SCROLL_INSET,
          width: 9,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${p * (1 - THUMB) * 100}%`,
            height: `${THUMB * 100}%`,
            borderRadius: 5,
            background: "rgba(235,235,240,0.42)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
