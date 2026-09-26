import { AbsoluteFill } from "remotion";

// A Chrome-style browser frame across the top of the film, dark theme, as
// if it were playing in a local dev page: a tab strip with the window
// buttons and one open tab, then the toolbar with back, forward, reload,
// the address field and the menu.

const TAB_STRIP = 46;
const TOOLBAR = 50;
export const BROWSER_BAR_HEIGHT = TAB_STRIP + TOOLBAR;

const SANS = "Inter, sans-serif";
const FRAME = "#1f2022"; // behind the tabs
const SURFACE = "#35363a"; // active tab and toolbar
const OMNIBOX = "#202124";
const TEXT = "#e8eaed";
const ICON = "#c4c7c5";

const Svg: React.FC<{
  size?: number;
  dim?: boolean;
  children: React.ReactNode;
}> = ({ size = 22, dim, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={ICON}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: dim ? 0.45 : 1, flexShrink: 0 }}
  >
    {children}
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

// The globe Chrome shows for a page without a favicon.
const Globe: React.FC = () => (
  <Svg size={18}>
    <circle cx={12} cy={12} r={9} />
    <path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" />
  </Svg>
);

// The active tab, with the curved feet Chrome gives it where it meets the
// toolbar.
const Tab: React.FC<{ title: string }> = ({ title }) => {
  const foot = (side: "left" | "right") => (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        [side]: -10,
        width: 10,
        height: 10,
        background: `radial-gradient(circle at ${side === "left" ? "0 0" : "100% 0"}, transparent 10px, ${SURFACE} 10.5px)`,
      }}
    />
  );
  return (
    <div
      style={{
        position: "relative",
        alignSelf: "flex-end",
        height: TAB_STRIP - 8,
        width: 290,
        marginLeft: 10,
        padding: "0 12px 0 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: SURFACE,
        borderRadius: "10px 10px 0 0",
      }}
    >
      {foot("left")}
      {foot("right")}
      <Globe />
      <div
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: 500,
          color: TEXT,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {title}
      </div>
      <Svg size={16}>
        <path d="M6 6l12 12M18 6L6 18" />
      </Svg>
    </div>
  );
};

const Avatar: React.FC = () => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: 14,
      background: "#5f6368",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    <svg width={22} height={22} viewBox="0 0 24 24" fill="#c4c7c5">
      <circle cx={12} cy={9} r={4.5} />
      <path d="M3 24c0-5 4-8.5 9-8.5s9 3.5 9 8.5z" />
    </svg>
  </div>
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
        fontFamily: SANS,
        boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
      }}
    >
      {/* Tab strip */}
      <div
        style={{
          height: TAB_STRIP,
          background: FRAME,
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
        }}
      >
        <div style={{ display: "flex", gap: 9, marginRight: 16 }}>
          <Light color="#ff5f57" />
          <Light color="#febc2e" />
          <Light color="#28c840" />
        </div>
        <div
          style={{
            width: 34,
            height: 30,
            borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg size={18}>
            <path d="M6 9l6 6 6-6" />
          </Svg>
        </div>
        <Tab title={url} />
        <div style={{ marginLeft: 20 }}>
          <Svg size={20}>
            <path d="M12 5v14M5 12h14" />
          </Svg>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          height: TOOLBAR,
          background: SURFACE,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 18px",
          borderBottom: "1px solid rgba(0,0,0,0.5)",
        }}
      >
        <Svg>
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </Svg>
        <Svg dim>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </Svg>
        <Svg size={20}>
          <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.2h-4.2" />
        </Svg>
        <div
          style={{
            flex: 1,
            height: 36,
            borderRadius: 18,
            background: OMNIBOX,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
          }}
        >
          <Svg size={18}>
            <circle cx={12} cy={12} r={9} />
            <path d="M12 11v6M12 7.6v.1" />
          </Svg>
          <div
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: "0.005em",
              color: TEXT,
            }}
          >
            {url}
          </div>
          <Svg size={18}>
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
          </Svg>
        </div>
        {/* Extensions */}
        <Svg>
          <path d="M9 4.5a2 2 0 0 1 4 0V6h4v4h-1.5a2 2 0 0 0 0 4H17v4.5H6V14h1.5a2 2 0 0 0 0-4H6V6h3z" />
        </Svg>
        <div
          style={{ width: 1, height: 22, background: "rgba(255,255,255,0.18)" }}
        />
        <Avatar />
        {/* Menu */}
        <svg width={22} height={22} viewBox="0 0 24 24" fill={ICON}>
          <circle cx={12} cy={5} r={1.8} />
          <circle cx={12} cy={12} r={1.8} />
          <circle cx={12} cy={19} r={1.8} />
        </svg>
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
