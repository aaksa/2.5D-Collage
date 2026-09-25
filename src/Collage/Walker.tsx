import { Img, staticFile } from "remotion";
import meta from "../../public/walker/meta.json";
import { Projected, WALKER_HEIGHT } from "./camera";

export const WALKER_FRAMES = meta.frames;

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
};

// Posterised gradient map: luminance is split into flat bands, one per colour,
// darkest first. This gives the screen-printed red/yellow look.
export const WalkerFilter: React.FC<{ colors: string[] }> = ({ colors }) => {
  const rgb = colors.map(hexToRgb);
  const table = (channel: number) => rgb.map((c) => c[channel]).join(" ");
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id="walker-look" colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"
        />
        {/* Sharpen so folds and creases survive the posterise. */}
        <feConvolveMatrix
          order="3"
          kernelMatrix="0 -0.7 0  -0.7 3.8 -0.7  0 -0.7 0"
          preserveAlpha="true"
        />
        {/* Lift the shadows so the dark shirt keeps its folds, then stretch. */}
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude={1.3} exponent={0.55} offset={-0.08} />
          <feFuncG type="gamma" amplitude={1.3} exponent={0.55} offset={-0.08} />
          <feFuncB type="gamma" amplitude={1.3} exponent={0.55} offset={-0.08} />
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues={table(0)} />
          <feFuncG type="discrete" tableValues={table(1)} />
          <feFuncB type="discrete" tableValues={table(2)} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

export const Walker: React.FC<{
  p: Projected;
  frame: number;
  glow: string;
}> = ({ p, frame, glow }) => {
  const k = (WALKER_HEIGHT * p.scale) / meta.personHeight;
  const index = String(Math.min(frame, meta.frames - 1) + 1).padStart(4, "0");
  return (
    <Img
      src={staticFile(`walker/${index}.webp`)}
      style={{
        position: "absolute",
        left: p.x - (meta.width * k) / 2,
        top: p.y - meta.groundY * k,
        width: meta.width * k,
        height: meta.height * k,
        filter: `url(#walker-look) drop-shadow(0 0 2px ${glow}) drop-shadow(0 0 10px ${glow}99)`,
      }}
    />
  );
};
