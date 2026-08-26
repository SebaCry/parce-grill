import { forwardRef } from "react";

/**
 * La caja de El Parce Grill, dibujada en SVG.
 *
 * La foto del empaque real trae el granito de la cocina de fondo y la tapa
 * entreabierta en un solo plano: separarla exigía un recorte manual que no
 * sobreviviría a un cambio de foto. Dibujada son piezas independientes que se
 * animan con transformaciones limpias, y el logo real —que ya viene como disco
 * negro— se incrusta tal cual en la tapa.
 *
 * Son TRES svg y no uno porque la hamburguesa tiene que quedar ENTRE el fondo
 * de la caja y su pared frontal: así, al bajar, desaparece por detrás del borde
 * en vez de esfumarse. Los tres comparten `viewBox` y se dimensionan igual, de
 * modo que las coordenadas coinciden exactamente sin medir nada en JS.
 *
 *   z: BoxBack  <  capas de la hamburguesa  <  BoxFront  <  BoxLid
 */

const VIEW_BOX = "0 0 440 300";

/** Boca del recipiente. Todo lo demás se deriva de estos cuatro números. */
const CX = 220;
const MOUTH_Y = 150;
const RX = 150;
const RY = 44;
// Caja baja, como la real: una honda se lee como cubo de palomitas.
const BOTTOM_Y = 214;

const KRAFT = { light: "#cdae83", mid: "#ac865a", dark: "#725634", rim: "#5c4327" };

/**
 * Mitades de la elipse de la boca.
 *
 * En SVG el ángulo crece en el sentido de las agujas del reloj (la y baja), así
 * que un arco de izquierda a derecha con sweep=1 pasa por ARRIBA y con sweep=0
 * por ABAJO. De ahí salen la mitad lejana (el borde que se ve al fondo) y la
 * cercana (el que tapa lo que hay dentro).
 */
const FAR_RIM = `M ${CX - RX} ${MOUTH_Y} A ${RX} ${RY} 0 0 1 ${CX + RX} ${MOUTH_Y}`;
const NEAR_RIM = `M ${CX - RX} ${MOUTH_Y} A ${RX} ${RY} 0 0 0 ${CX + RX} ${MOUTH_Y}`;

type SvgProps = { className?: string };

export const BoxBack = forwardRef<SVGSVGElement, SvgProps>(function BoxBack({ className }, ref) {
  return (
    <svg ref={ref} className={className} viewBox={VIEW_BOX} fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="box-cavity" cx="0.5" cy="0.28" r="0.8">
          <stop offset="0%" stopColor="#332619" />
          <stop offset="100%" stopColor="#0e0a06" />
        </radialGradient>
      </defs>
      {/* Hueco: es lo que se ve a través de la boca. */}
      <ellipse cx={CX} cy={MOUTH_Y} rx={RX} ry={RY} fill="url(#box-cavity)" />
      {/* Borde del fondo, por detrás de la comida. */}
      <path d={FAR_RIM} stroke={KRAFT.light} strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
});

export const BoxFront = forwardRef<SVGSVGElement, SvgProps>(function BoxFront({ className }, ref) {
  return (
    <svg ref={ref} className={className} viewBox={VIEW_BOX} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="box-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={KRAFT.dark} />
          <stop offset="20%" stopColor={KRAFT.mid} />
          <stop offset="50%" stopColor={KRAFT.light} />
          <stop offset="80%" stopColor={KRAFT.mid} />
          <stop offset="100%" stopColor={KRAFT.dark} />
        </linearGradient>
      </defs>
      {/* Pared frontal: del borde cercano de la boca al borde cercano del
          fondo. Es el oclusor que hace que la hamburguesa entre en la caja. */}
      <path
        d={
          `M ${CX - RX} ${MOUTH_Y} A ${RX} ${RY} 0 0 0 ${CX + RX} ${MOUTH_Y} ` +
          `L ${CX + RX} ${BOTTOM_Y} A ${RX} ${RY} 0 0 1 ${CX - RX} ${BOTTOM_Y} Z`
        }
        fill="url(#box-wall)"
      />
      <path d={NEAR_RIM} stroke={KRAFT.light} strokeWidth="9" strokeLinecap="round" />
      {/* Nervio del cartón corrugado. */}
      <path
        d={`M ${CX - RX} ${MOUTH_Y + 40} A ${RX} ${RY} 0 0 0 ${CX + RX} ${MOUTH_Y + 40}`}
        stroke={KRAFT.rim}
        strokeWidth="2"
        opacity="0.4"
      />
    </svg>
  );
});

const LID_RX = 158;
const LID_RY = 46;
const LID_Y = 132;
const LID_DEPTH = 18;
const LABEL_RX = 132;
const LABEL_RY = 38;

export const BoxLid = forwardRef<SVGSVGElement, SvgProps>(function BoxLid({ className }, ref) {
  return (
    <svg ref={ref} className={className} viewBox={VIEW_BOX} fill="none" aria-hidden="true">
      <defs>
        <clipPath id="lid-label">
          <ellipse cx={CX} cy={LID_Y} rx={LABEL_RX} ry={LABEL_RY} />
        </clipPath>
        <linearGradient id="lid-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={KRAFT.dark} />
          <stop offset="50%" stopColor={KRAFT.mid} />
          <stop offset="100%" stopColor={KRAFT.dark} />
        </linearGradient>
      </defs>
      {/* Canto de la tapa. */}
      <path
        d={
          `M ${CX - LID_RX} ${LID_Y} A ${LID_RX} ${LID_RY} 0 0 0 ${CX + LID_RX} ${LID_Y} ` +
          `L ${CX + LID_RX} ${LID_Y + LID_DEPTH} ` +
          `A ${LID_RX} ${LID_RY} 0 0 1 ${CX - LID_RX} ${LID_Y + LID_DEPTH} Z`
        }
        fill="url(#lid-edge)"
      />
      <ellipse cx={CX} cy={LID_Y} rx={LID_RX} ry={LID_RY} fill={KRAFT.light} />
      <ellipse cx={CX} cy={LID_Y} rx={LABEL_RX} ry={LABEL_RY} fill="#0b0b0c" />
      {/* El logo real. `preserveAspectRatio="none"` lo aplasta exactamente en la
          misma proporción que la elipse de la etiqueta (38/132), así que el
          escorzo es el correcto y no una deformación arbitraria. */}
      <g clipPath="url(#lid-label)">
        <image
          href="/logo.png"
          x={CX - LABEL_RX}
          y={LID_Y - LABEL_RY}
          width={LABEL_RX * 2}
          height={LABEL_RY * 2}
          preserveAspectRatio="none"
        />
      </g>
    </svg>
  );
});
