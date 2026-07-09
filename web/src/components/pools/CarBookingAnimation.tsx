"use client";

import React from "react";

interface CarBookingAnimationProps {
  state: "idle" | "booking" | "success";
  totalSeats?: number;
  availableSeats?: number;
  carType?: string;
}

export default function CarBookingAnimation({
  state,
  totalSeats = 4,
  availableSeats = 4,
  carType = "sedan",
}: CarBookingAnimationProps) {
  const isAuto = carType?.toLowerCase() === "auto";
  const bookedCount = totalSeats - availableSeats;

  // Seating states helper for riders (excluding host)
  const getSeatColorClass = (riderIndex: number) => {
    const isAlreadyBooked = bookedCount > riderIndex;
    const isTargetOfBooking = bookedCount === riderIndex;

    if (isAlreadyBooked) {
      return "seat-occupied";
    }

    if (isTargetOfBooking) {
      if (state === "booking") return "seat-pulsing";
      if (state === "success") return "seat-occupied";
    }

    return "seat-available";
  };

  return (
    <div className="car-booking-container">
      <style>{`
        .car-booking-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px 0;
          background: transparent;
        }

        .car-outline {
          stroke: var(--muted, #7f8c8d);
          stroke-width: 3.5px;
          fill: var(--panel, #ffffff);
          transition: all 0.5s ease-in-out;
        }

        .car-outline-success {
          stroke: var(--teal, #10b981);
          filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.6));
          animation: success-glow-pulse 2s infinite ease-in-out;
        }

        .car-detail {
          stroke: var(--line-strong, #cbd5e1);
          stroke-width: 2px;
          fill: none;
        }

        .seat-back, .seat-head {
          transition: fill 0.6s ease-in-out, stroke 0.6s ease-in-out;
        }

        /* Hired Driver's Seat (neutral dark/slate) */
        .seat-driver .seat-back,
        .seat-driver .seat-head {
          fill: #475569;
          stroke: none;
        }

        /* Student Host and Booked Riders (green) */
        .seat-occupied .seat-back,
        .seat-occupied .seat-head {
          fill: var(--teal, #10b981);
          stroke: none;
        }

        /* Available student seats (grey) */
        .seat-available .seat-back,
        .seat-available .seat-head {
          fill: var(--line-strong, #cbd5e1);
          stroke: none;
        }

        /* Seat currently being booked (pulsing green) */
        .seat-pulsing .seat-back,
        .seat-pulsing .seat-head {
          animation: seat-pulse-anim 1.2s infinite ease-in-out;
        }

        @keyframes seat-pulse-anim {
          0% {
            fill: var(--line-strong, #cbd5e1);
          }
          50% {
            fill: rgba(16, 185, 129, 0.65);
          }
          100% {
            fill: var(--line-strong, #cbd5e1);
          }
        }

        @keyframes success-glow-pulse {
          0% {
            filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.9));
          }
          100% {
            filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.4));
          }
        }
      `}</style>

      {isAuto ? (
        // ── AUTO-RICKSHAW LAYOUT (4 seats total: 1 driver + 3 passenger seats) ──
        <svg
          viewBox="0 0 400 200"
          width="100%"
          style={{ maxWidth: "340px", height: "auto" }}
        >
          {/* Auto shadow/glow behind the body */}
          <path
            d="M 95,100 C 95,90 120,80 155,75 C 165,75 170,65 190,65 L 285,65 C 295,65 300,75 300,100 C 300,125 295,135 285,135 L 190,135 C 170,135 165,125 155,125 C 120,120 95,110 95,100 Z"
            fill="transparent"
            className={state === "success" ? "car-outline-success" : ""}
          />

          {/* Front Wheel */}
          <rect x="72" y="96" width="20" height="8" rx="2" fill="#334155" />

          {/* Rear Wheels */}
          <rect x="245" y="52" width="26" height="10" rx="3" fill="#334155" />
          <rect x="245" y="138" width="26" height="10" rx="3" fill="#334155" />

          {/* Auto Body */}
          <path
            d="M 95,100 C 95,90 120,80 155,75 C 165,75 170,65 190,65 L 285,65 C 295,65 300,75 300,100 C 300,125 295,135 285,135 L 190,135 C 170,135 165,125 155,125 C 120,120 95,110 95,100 Z"
            className={`car-outline ${state === "success" ? "car-outline-success" : ""}`}
          />

          {/* Windshield / Front Glass */}
          <path d="M 145,80 Q 150,100 145,120" className="car-detail" />

          {/* Handlebars */}
          <path d="M 135,86 L 140,100 L 135,114" className="car-detail" style={{ strokeWidth: "3px" }} />

          {/* Canopy Roof Ribs */}
          <path d="M 190,65 L 190,135" className="car-detail" />
          <path d="M 235,65 L 235,135" className="car-detail" />
          <path d="M 280,65 L 280,135" className="car-detail" />

          {/* ── SEATS ── */}

          {/* 1. Hired Auto Driver (Front Center) */}
          <g className="seat-driver">
            <rect
              x="168"
              y="91"
              width="22"
              height="18"
              rx="4"
              className="seat-back"
            />
          </g>

          {/* 2. Host Passenger (Back Row, Top) - Always occupied (green) */}
          <g className="seat-occupied">
            <rect
              x="250"
              y="72"
              width="24"
              height="16"
              rx="3"
              className="seat-back"
            />
          </g>

          {/* 3. Rider 1 (Back Row, Middle) */}
          <g className={getSeatColorClass(0)}>
            <rect
              x="250"
              y="92"
              width="24"
              height="16"
              rx="3"
              className="seat-back"
            />
          </g>

          {/* 4. Rider 2 (Back Row, Bottom) */}
          <g className={getSeatColorClass(1)}>
            <rect
              x="250"
              y="112"
              width="24"
              height="16"
              rx="3"
              className="seat-back"
            />
          </g>
        </svg>
      ) : (
        // ── CAR/SEDAN LAYOUT (5 seats total: 1 driver + 4 passenger seats) ──
        <svg
          viewBox="0 0 400 200"
          width="100%"
          style={{ maxWidth: "340px", height: "auto" }}
        >
          {/* Car shadow/glow behind the body */}
          <path
            d="M 60,100 C 60,80 80,55 120,55 L 280,55 C 330,55 350,80 350,100 C 350,120 330,145 280,145 L 120,145 C 80,140 60,120 60,100 Z"
            fill="transparent"
            className={state === "success" ? "car-outline-success" : ""}
          />

          {/* Main Car Body */}
          <path
            d="M 60,100 C 60,80 80,55 120,55 L 280,55 C 330,55 350,80 350,100 C 350,120 330,145 280,145 L 120,145 C 80,140 60,120 60,100 Z"
            className={`car-outline ${state === "success" ? "car-outline-success" : ""}`}
          />

          {/* Side Mirrors */}
          <path
            d="M 140,55 C 135,40 148,32 153,32 C 153,32 154,50 152,55"
            className={`car-outline ${state === "success" ? "car-outline-success" : ""}`}
          />
          <path
            d="M 140,145 C 135,160 148,168 153,168 C 153,168 154,150 152,145"
            className={`car-outline ${state === "success" ? "car-outline-success" : ""}`}
          />

          {/* Windshield */}
          <path
            d="M 135,65 C 145,65 155,75 155,100 C 155,125 145,135 135,135"
            className="car-detail"
          />

          {/* Rear Window */}
          <path
            d="M 295,65 C 285,65 275,75 275,100 C 275,125 285,135 295,135"
            className="car-detail"
          />

          {/* Hood Lines */}
          <path d="M 65,85 Q 110,90 110,100" className="car-detail" />
          <path d="M 65,115 Q 110,110 110,100" className="car-detail" />

          {/* Headlights */}
          <path d="M 72,60 Q 65,65 68,75 Q 75,72 72,60 Z" fill="#e2e8f0" />
          <path d="M 72,140 Q 65,135 68,125 Q 75,128 72,140 Z" fill="#e2e8f0" />

          {/* Seating Layout */}
          
          {/* 1. Hired Taxi Driver (Front-Right / Bottom-Left in SVG) */}
          <g className="seat-driver">
            <rect
              x="166"
              y="112.5"
              width="8"
              height="10"
              rx="3"
              className="seat-head"
            />
            <rect
              x="175"
              y="105"
              width="30"
              height="25"
              rx="6"
              className="seat-back"
            />
          </g>

          {/* 2. Host Student Passenger (Front-Left / Top-Left in SVG) - Always green */}
          <g className="seat-occupied">
            <rect
              x="166"
              y="77.5"
              width="8"
              height="10"
              rx="3"
              className="seat-head"
            />
            <rect
              x="175"
              y="70"
              width="30"
              height="25"
              rx="6"
              className="seat-back"
            />
          </g>

          {/* 3. Rider 1 (Back Row, Top) */}
          <g className={getSeatColorClass(0)}>
            <rect
              x="231"
              y="77.5"
              width="8"
              height="10"
              rx="3"
              className="seat-head"
            />
            <rect
              x="240"
              y="70"
              width="30"
              height="25"
              rx="6"
              className="seat-back"
            />
          </g>

          {/* 4. Rider 2 (Back Row, Middle) */}
          <g className={getSeatColorClass(1)}>
            <rect
              x="231"
              y="95"
              width="8"
              height="10"
              rx="3"
              className="seat-head"
            />
            <rect
              x="240"
              y="87.5"
              width="30"
              height="25"
              rx="6"
              className="seat-back"
            />
          </g>

          {/* 5. Rider 3 (Back Row, Bottom) */}
          <g className={getSeatColorClass(2)}>
            <rect
              x="231"
              y="112.5"
              width="8"
              height="10"
              rx="3"
              className="seat-head"
            />
            <rect
              x="240"
              y="105"
              width="30"
              height="25"
              rx="6"
              className="seat-back"
            />
          </g>
        </svg>
      )}
    </div>
  );
}
