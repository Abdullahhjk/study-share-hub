export function ColorblindFilters() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "none" }}
      aria-hidden="true"
    >
      <defs>
        {/* Achromatopsia - Full grayscale via luminance weights */}
        <filter id="cb-achromatopsia" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0"
          />
        </filter>

        {/* Achromatomaly - Partial desaturation */}
        <filter id="cb-achromatomaly" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0.15" />
        </filter>

        {/* Blue Cone Monochromacy - Full grayscale */}
        <filter id="cb-blue-cone" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0"
          />
        </filter>

        {/* Protanopia - Contrast boost for red-blind */}
        <filter id="cb-protanopia" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.35" intercept="-0.175" />
            <feFuncG type="linear" slope="1.35" intercept="-0.175" />
            <feFuncB type="linear" slope="1.35" intercept="-0.175" />
          </feComponentTransfer>
        </filter>

        {/* Deuteranopia - Contrast boost for green-blind */}
        <filter id="cb-deuteranopia" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.35" intercept="-0.175" />
            <feFuncG type="linear" slope="1.35" intercept="-0.175" />
            <feFuncB type="linear" slope="1.35" intercept="-0.175" />
          </feComponentTransfer>
        </filter>

        {/* Tritanopia - Contrast boost for blue-blind */}
        <filter id="cb-tritanopia" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.35" intercept="-0.175" />
            <feFuncG type="linear" slope="1.35" intercept="-0.175" />
            <feFuncB type="linear" slope="1.35" intercept="-0.175" />
          </feComponentTransfer>
        </filter>

        {/* Protanomaly - Mild contrast boost for red-weak */}
        <filter id="cb-protanomaly" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.15" intercept="-0.075" />
            <feFuncG type="linear" slope="1.15" intercept="-0.075" />
            <feFuncB type="linear" slope="1.15" intercept="-0.075" />
          </feComponentTransfer>
        </filter>

        {/* Deuteranomaly - Mild contrast boost for green-weak */}
        <filter id="cb-deuteranomaly" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.15" intercept="-0.075" />
            <feFuncG type="linear" slope="1.15" intercept="-0.075" />
            <feFuncB type="linear" slope="1.15" intercept="-0.075" />
          </feComponentTransfer>
        </filter>

        {/* Tritanomaly - Mild contrast boost for blue-weak */}
        <filter id="cb-tritanomaly" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.15" intercept="-0.075" />
            <feFuncG type="linear" slope="1.15" intercept="-0.075" />
            <feFuncB type="linear" slope="1.15" intercept="-0.075" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
