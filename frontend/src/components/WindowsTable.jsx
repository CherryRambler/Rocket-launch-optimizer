import { useState } from "react";

function ScoreBadge({ score }) {
  const cls =
    score >= 70 ? "score-high" : score >= 45 ? "score-mid" : "score-low";
  return (
    <span className={`px-2 py-0.5 rounded border font-mono text-xs font-bold ${cls}`}>
      {score.toFixed(1)}
    </span>
  );
}

function WeatherFlag({ lightning, cloud }) {
  if (lightning) return <span title="Lightning risk">⚡</span>;
  if (cloud > 70) return <span title="High cloud cover">☁️</span>;
  return <span title="Clear">✅</span>;
}

const IST_OPTIONS = {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export default function WindowsTable({ windows }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700">
            <th className="px-4 py-3 text-left">Rank</th>
            <th className="px-4 py-3 text-left">Date / Time (IST)</th>
            <th className="px-4 py-3 text-center">Total Score</th>
            <th className="px-4 py-3 text-center">Orbital</th>
            <th className="px-4 py-3 text-center">Δv Score</th>
            <th className="px-4 py-3 text-center">Weather</th>
            <th className="px-4 py-3 text-right">Δv (m/s)</th>
            <th className="px-4 py-3 text-right">Azimuth</th>
            <th className="px-4 py-3 text-center">Conditions</th>
          </tr>
        </thead>
        <tbody>
          {windows.map((w) => {
            const isOpen = expanded === w.rank;
            const dt = new Date(w.timestamp);
            return (
              <>
                <tr
                  key={w.rank}
                  onClick={() => setExpanded(isOpen ? null : w.rank)}
                  className={`border-b border-slate-800 cursor-pointer transition-colors
                    ${w.rank === 1 ? "bg-blue-900/10" : ""}
                    hover:bg-slate-800/50`}
                >
                  <td className="px-4 py-3">
                    <span className={`font-bold font-mono ${w.rank === 1 ? "text-isro-orange text-base" : "text-slate-300"}`}>
                      {w.rank === 1 ? "★" : ""} #{w.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">
                    {dt.toLocaleString("en-IN", IST_OPTIONS)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={w.score_total} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={w.score_orbital} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={w.score_delta_v} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={w.score_weather} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {w.delta_v_ms.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {w.azimuth_deg.toFixed(1)}°
                  </td>
                  <td className="px-4 py-3 text-center">
                    <WeatherFlag lightning={w.lightning_risk} cloud={w.cloud_cover_pct} />
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`${w.rank}-detail`} className="bg-space-800">
                    <td colSpan={9} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                        <Detail label="Cloud Cover" value={`${w.cloud_cover_pct}%`} />
                        <Detail label="Wind Speed" value={`${w.wind_speed_ms} m/s`} />
                        <Detail label="Lightning Risk" value={w.lightning_risk ? "YES ⚡" : "No"} />
                        <Detail label="Payload Mass" value={`${w.payload_mass_kg} kg`} />
                        <Detail label="Launch Azimuth" value={`${w.azimuth_deg.toFixed(1)}°`} />
                        <Detail label="Total Δv" value={`${w.delta_v_ms.toLocaleString()} m/s`} />
                        <Detail label="Orbit Type" value={w.orbit_type} />
                        <Detail label="UTC Time" value={new Date(w.timestamp).toUTCString()} />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 px-4 py-2">Click a row to expand details</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-slate-500 uppercase text-[10px] tracking-wider">{label}</p>
      <p className="text-slate-200 mt-0.5">{value}</p>
    </div>
  );
}
