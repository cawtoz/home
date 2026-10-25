import { plan } from './plan';

export function renderPlan() {
      "use strict";

      const svg = document.getElementById("plan");
      const ns = "http://www.w3.org/2000/svg";
      const px = metres => metres * plan.scale;
      const round = value => Number(value.toFixed(2));
      const metres = (value, compact = false) => `${value.toFixed(2).replace(".", ",")}${compact ? "m" : " m"}`;
      const sizeText = (a, b) => `${metres(a, true)} × ${metres(b, true)}`;

      function add(tag, attributes, content) {
        const element = document.createElementNS(ns, tag);
        for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
        if (content !== undefined) element.textContent = content;
        svg.append(element);
        return element;
      }

      function label(x, y, value, options = {}) {
        const attributes = { x: round(x), y: round(y) };
        if (options.dimension) attributes.class = "dimension-text";
        if (options.vertical) attributes.transform = `rotate(-90 ${round(x)} ${round(y)})`;
        add("text", attributes, value);
      }

      function furniture(x, y, width, height, measurement) {
        add("rect", { class: "furniture", x: round(x), y: round(y), width: round(width), height: round(height) });
        if (measurement) label(x + width / 2, y + height / 2, measurement);
      }

      function horizontalDimension(points, y, values, textY, tick = 6) {
        const marks = points.map(x => `M${round(x)} ${round(y - tick)}V${round(y + tick)}`).join(" ");
        add("path", { class: "dimension", d: `M${round(points[0])} ${round(y)}H${round(points[points.length - 1])} ${marks}` });
        values.forEach((value, index) => label((points[index] + points[index + 1]) / 2, textY, metres(value), { dimension: true }));
      }

      function verticalDimension(x, points, values, textX, tick = 5) {
        const marks = points.map(y => `M${round(x - tick)} ${round(y)}H${round(x + tick)}`).join(" ");
        add("path", { class: "dimension", d: `M${round(x)} ${round(points[0])}V${round(points[points.length - 1])} ${marks}` });
        values.forEach((value, index) => label(textX, (points[index] + points[index + 1]) / 2, metres(value), { dimension: true, vertical: true }));
      }

      const halfWall = plan.wallThickness / 2;
      const left = plan.origin.x;
      const top = plan.origin.y;
      const right = left + px(plan.totalLength);
      const bedroomRight = left + px(plan.bedroom.length);
      const bedroomLeftBottom = top + px(plan.bedroom.leftDepth);
      const bedroomRightBottom = top + px(plan.bedroom.rightDepth);
      const recessRight = bedroomRight + px(plan.recess.length);
      const recessTop = bedroomRightBottom - px(plan.recess.rise);
      const stairTop = top + px(plan.right.upper);
      const bottom = stairTop + px(plan.right.stairLength);
      const stairLeft = recessRight + px(plan.right.clearToStair);
      const stairRight = stairLeft + px(plan.right.stairWidth);
      const bottomAt = x => bedroomLeftBottom + (x - left) * (bedroomRightBottom - bedroomLeftBottom) / (bedroomRight - left);
      // Los tres tramos de muro se miden sobre la pared inclinada.
      // Hasta conocer los anchos reales, las dos ventanas comparten el espacio restante por igual.
      const slopeLength = Math.hypot(plan.bedroom.length, plan.bedroom.rightDepth - plan.bedroom.leftDepth);
      const wallSpaces = plan.windowWalls;
      const windowWidth = (slopeLength - wallSpaces.left - wallSpaces.between - wallSpaces.right) / 2;
      const horizontalRatio = plan.bedroom.length / slopeLength;
      const onWindowWall = distance => round(left + px(distance * horizontalRatio));
      const windows = [
        [onWindowWall(wallSpaces.left), onWindowWall(wallSpaces.left + windowWidth)],
        [onWindowWall(wallSpaces.left + windowWidth + wallSpaces.between), onWindowWall(wallSpaces.left + 2 * windowWidth + wallSpaces.between)]
      ];
      const [firstWindow, secondWindow] = windows;

      // El encuadre sigue el tamaño del plano y conserva márgenes para las cotas.
      svg.style.setProperty("--wall-width", plan.wallThickness);
      svg.setAttribute("viewBox", `${round(left - 70)} ${round(top - 68)} ${round(right - left + 146)} ${round(bottom - top + 138)}`);

      // Contorno. La pared de las ventanas pasa de 2,00 a 2,20 m de profundidad.
      add("path", {
        class: "wall",
        d: `M${left} ${top}H${right}V${bottom}H${recessRight}V${recessTop}H${bedroomRight}V${bedroomRightBottom}` +
          `L${secondWindow[1]} ${round(bottomAt(secondWindow[1]))} ` +
          `M${secondWindow[0]} ${round(bottomAt(secondWindow[0]))}L${firstWindow[1]} ${round(bottomAt(firstWindow[1]))} ` +
          `M${firstWindow[0]} ${round(bottomAt(firstWindow[0]))}L${left} ${bedroomLeftBottom}V${top}`
      });
      for (const [start, end] of windows) {
        for (const offset of [-3, 3]) {
          add("path", { class: "window", d: `M${start} ${round(bottomAt(start) + offset)}L${end} ${round(bottomAt(end) + offset)}` });
        }
      }
      add("path", { class: "wall", d: `M${bedroomRight} ${top + px(plan.bedroom.entrance)}V${recessTop}` });

      // El límite de nivel es un trazo ligero; el lado del clóset queda 0,10 m más bajo.
      const level = plan.vertical.interiorDrop;
      const levelY = top + px(0.78);
      add("path", { class: "level-change", d: `M${recessRight} ${top + halfWall}V${recessTop - halfWall}` });
      const direction = level.lowerSide === "closet" ? -1 : 1;
      const arrowStart = recessRight + direction * -19;
      const arrowEnd = recessRight + direction * 13;
      add("path", { class: "level-direction",
        d: `M${arrowStart} ${levelY}H${arrowEnd} M${arrowEnd - direction * 5} ${levelY - 4}L${arrowEnd} ${levelY}L${arrowEnd - direction * 5} ${levelY + 4}` });
      add("text", { class: "level-label", x: recessRight + 55, y: levelY }, metres(level.height));

      // Muebles. Su geometría y la medida escrita salen del mismo dato.
      const bed = plan.furniture.bed;
      furniture(left + halfWall + 1, top + px(bed.topOffset), px(bed.length), px(bed.width), sizeText(bed.length, bed.width));

      const closet = plan.furniture.closet;
      const closetX = bedroomRight + (px(plan.recess.length) - px(closet.length)) / 2 + px(closet.shiftRight);
      furniture(closetX, recessTop - halfWall - px(closet.depth), px(closet.length), px(closet.depth), sizeText(closet.length, closet.depth));

      const upperTable = plan.furniture.upperTable;
      furniture(right - halfWall - px(upperTable.length), top + halfWall, px(upperTable.length), px(upperTable.depth), sizeText(upperTable.length, upperTable.depth));

      const setup = plan.furniture.setup;
      furniture(recessRight + halfWall + px(setup.gapFromRecess), bottom - halfWall - px(setup.length), px(setup.width), px(setup.length), sizeText(setup.length, setup.width));

      // Escalera: seis peldaños iguales. El trazo derecho toca la cara interior del muro.
      add("path", { class: "stair", d: `M${stairRight} ${stairTop}H${stairLeft}V${bottom}` });
      for (let step = 1; step < plan.right.steps; step++) {
        const y = round(stairTop + step * px(plan.right.stairLength) / plan.right.steps);
        add("path", { class: "step", d: `M${stairLeft} ${y}H${stairRight}` });
      }

      // Cotas estructurales. Las medidas de muebles ya están dentro de cada pieza.
      horizontalDimension([left, right], top - 30, [plan.totalLength], top - 45, 5);
      verticalDimension(left - 30, [top, bedroomLeftBottom], [plan.bedroom.leftDepth], left - 47);
      verticalDimension(bedroomRight - 30, [top, top + px(plan.bedroom.entrance), bedroomRightBottom],
        [plan.bedroom.entrance, plan.bedroom.rightDepth - plan.bedroom.entrance], bedroomRight - 16);
      verticalDimension(right + 30, [top, stairTop, bottom], [plan.right.upper, plan.right.stairLength], right + 51);
      verticalDimension(bedroomRight + 26, [recessTop, bedroomRightBottom], [plan.recess.rise], bedroomRight + 43, 6);
      horizontalDimension([left, bedroomRight, recessRight], bedroomRightBottom + 30,
        [plan.bedroom.length, plan.recess.length], bedroomRightBottom + 50);
      horizontalDimension([recessRight, stairLeft, stairRight], bottom + 30,
        [plan.right.clearToStair, plan.right.stairWidth], bottom + 50);

      // Dato de altura para una futura vista 3D; se muestra como nota fuera de las cotas en planta.
      add("text", { class: "note", x: left, y: bottom + 46 },
        `Altura al techo: ${metres(plan.vertical.ceilingHeight)} · Acceso: bajar ${metres(plan.vertical.accessDrop)}`);
    }
