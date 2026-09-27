/** Original schematic selection illustration; not a diagnostic anatomical map. */
export function FocusMap({ focus }: { focus: Record<string, number> }) {
  const region = (key: string) => ({
    fill: "currentColor",
    opacity: focus[key] ? 0.9 : 0.16,
  });
  return (
    <figure className="focus-map">
      <svg
        viewBox="0 0 320 275"
        role="img"
        aria-label="Kas öncelikleri şeması; seçilen bölgeler koyu renkle gösterilir"
      >
        {[0, 160].map((x) => (
          <g
            key={x}
            transform={`translate(${x},0)`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity=".5"
          >
            <circle cx="80" cy="26" r="16" />
            <path d="M69 44L50 53 30 112 37 155 46 151 45 115 56 90 59 143 54 189 60 248 73 248 79 180 85 248 98 248 104 189 99 143 103 90 115 115 114 151 123 155 130 112 110 53 91 44" />
          </g>
        ))}
        <g>
          <path
            d="M58 60Q80 53 101 60L97 88 81 84 63 88Z"
            {...region("chest")}
          />
          <path
            d="M52 53L61 60 57 82 45 82ZM107 53L98 60 102 82 115 82Z"
            {...region("shoulders")}
          />
          <path
            d="M44 86L54 87 44 116 44 145 37 145 35 113ZM107 87L117 86 125 113 123 145 116 145 116 116Z"
            {...region("arms")}
          />
          <path d="M65 94L94 94 94 137 66 137Z" {...region("core")} />
          <path
            d="M62 150L76 150 73 190 60 190ZM84 150L98 150 100 190 86 190Z"
            {...region("quads")}
          />
          <path
            d="M60 196L73 196 69 237 62 237ZM86 196L99 196 96 237 90 237Z"
            {...region("calves")}
          />
        </g>
        <g transform="translate(160,0)">
          <path
            d="M60 61L99 61 96 102 84 122 76 122 63 102Z"
            {...region("back")}
          />
          <path
            d="M60 132L99 132 102 152 98 190 85 190 81 159 75 190 59 190 57 151Z"
            {...region("posterior")}
          />
          <path
            d="M60 196L73 196 69 237 62 237ZM86 196L99 196 96 237 90 237Z"
            {...region("calves")}
          />
        </g>
        <text
          x="80"
          y="270"
          textAnchor="middle"
          fill="currentColor"
          fontSize="12"
        >
          Ön
        </text>
        <text
          x="240"
          y="270"
          textAnchor="middle"
          fill="currentColor"
          fontSize="12"
        >
          Arka
        </text>
      </svg>
      <figcaption>Şematik görünüm · önceliklerini aşağıdan seç</figcaption>
    </figure>
  );
}
