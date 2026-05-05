import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useApp } from "../context/AppContext";

const IST = {
  timeZone: "Asia/Kolkata",
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit",
};

export default function ExportButton() {
  const { windows, formValues } = useApp();

  const handleExport = () => {
    if (!windows.length) return;

    const doc  = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const best = windows[0];

    // Background
    doc.setFillColor(8, 12, 24);
    doc.rect(0, 0, 297, 210, "F");

    // Header rule
    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(0.4);
    doc.line(14, 22, 283, 22);

    // Title
    doc.setTextColor(232, 234, 240);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LAUNCH WINDOW OPTIMIZER", 14, 16);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("SDSC SHAR, Sriharikota  ·  Mission Planning Report", 14, 28);
    doc.text(`Generated ${format(new Date(), "dd MMM yyyy HH:mm")} IST`, 220, 28);

    // Mission params block
    doc.setTextColor(0, 210, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("MISSION PARAMETERS", 14, 38);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    const params = [
      ["Orbit type",        formValues.orbit_type ?? "—"],
      ["Date range",        `${formValues.start_date ?? "—"}  →  ${formValues.end_date ?? "—"}`],
      ["Payload mass",      `${formValues.payload_mass_kg ?? "—"} kg`],
      ["Weather weight",    `${((formValues.weather_weight ?? 0.2) * 100).toFixed(0)}%`],
      ["Wind tolerance",    `${formValues.wind_tolerance_kmh ?? "—"} km/h`],
    ];
    params.forEach(([k, v], i) => {
      doc.setTextColor(107, 114, 128);  doc.text(k, 14, 46 + i * 5.5);
      doc.setTextColor(203, 213, 225);  doc.text(v, 60, 46 + i * 5.5);
    });

    // Best window highlight
    doc.setFillColor(13, 17, 34);
    doc.roundedRect(14, 76, 269, 16, 2, 2, "F");
    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, 76, 269, 16, 2, 2, "S");
    doc.setTextColor(0, 210, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("RECOMMENDED WINDOW", 18, 82);
    doc.setTextColor(232, 234, 240);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `${new Date(best.timestamp).toLocaleString("en-IN", IST)}  ·  Score ${best.score_total}/100  ·  Δv ${best.delta_v_ms.toLocaleString()} m/s  ·  Azimuth ${best.azimuth_deg.toFixed(1)}°  ·  Cloud ${best.cloud_cover_pct}%  ·  Wind ${best.wind_speed_ms} m/s`,
      18, 88
    );

    // Table
    autoTable(doc, {
      startY: 98,
      head: [["#", "Date / Time (IST)", "Score", "Orbital", "Δv score", "Weather", "Δv m/s", "Azimuth", "Cloud", "Wind", "Risk"]],
      body: windows.map(w => [
        w.rank,
        new Date(w.timestamp).toLocaleString("en-IN", IST),
        w.score_total.toFixed(1),
        w.score_orbital.toFixed(1),
        w.score_delta_v.toFixed(1),
        w.score_weather.toFixed(1),
        w.delta_v_ms.toLocaleString(),
        `${w.azimuth_deg.toFixed(1)}°`,
        `${w.cloud_cover_pct}%`,
        `${w.wind_speed_ms} m/s`,
        w.launch_risk_level,
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        fillColor: [8, 12, 24],
        textColor: [156, 163, 175],
        lineColor: [30, 41, 59],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [13, 17, 34],
        textColor: [107, 114, 128],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [13, 17, 34] },
      didParseCell: (data) => {
        // Highlight rank 1 row
        if (data.section === "body" && data.row.index === 0) {
          data.cell.styles.textColor = [0, 210, 255];
          data.cell.styles.fontStyle = "bold";
        }
        // Colour risk column
        if (data.column.index === 10 && data.section === "body") {
          const risk = data.cell.raw;
          data.cell.styles.textColor =
            risk === "GO" ? [0, 230, 118] : risk === "MARGINAL" ? [255, 193, 7] : [244, 67, 54];
        }
      },
    });

    // Footer
    doc.setFontSize(6.5);
    doc.setTextColor(55, 65, 81);
    doc.text(
      "Scoring: 40% Orbital Alignment · 40% Δv Efficiency · 20% Weather  ·  Launch Window Optimizer",
      14, 202
    );

    doc.save(`launch_windows_${formValues.orbit_type}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!windows.length}
      className="btn-ghost"
    >
      <Download size={13} />
      Export PDF
    </button>
  );
}
