<template>
  <div ref="el" id="game"></div>
  <div id="controls">
    <div>
      <button @click="toggleFullscreen">
        <font-awesome-icon :icon="fullscreen ? 'compress' : 'expand'" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as PIXI from "pixi.js";
import { onMounted, ref, watchEffect } from "vue";
import { kdTree } from "kd-tree-javascript";

// App
const app = new PIXI.Application({
  width: 1920,
  height: 1080,
  backgroundColor: 0xffbc01,
});
const el = ref<HTMLElement | null>(null);
onMounted(() => el.value?.appendChild(app.view));

// Fullscreen
const fullscreen = ref<boolean>(window.innerHeight == screen.height);
const toggleFullscreen = () => {
  fullscreen.value = !fullscreen.value;
  if (fullscreen.value) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

const welcomeBackground = PIXI.Sprite.from("./resources/images/start.png");
app.stage.addChild(welcomeBackground);

const btnMode1 = PIXI.Sprite.from("./resources/images/btn-mode1.png");
btnMode1.interactive = true;
btnMode1.buttonMode = true;
btnMode1.position.set(500, 500);
app.stage.addChild(btnMode1);
btnMode1.on("pointerdown", () => {
  app.stage.removeChild(welcomeBackground);
  app.stage.removeChild(btnMode1);
  app.stage.removeChild(btnMode2);
  const help = PIXI.Sprite.from("./resources/images/help-mode1.png");
  help.interactive = true;
  help.buttonMode = true;
  app.stage.addChild(help);
  help.on("pointerdown", () => {
    app.stage.removeChild(help);
    start();
  });
});

const btnMode2 = PIXI.Sprite.from("./resources/images/btn-mode2.png");
btnMode2.interactive = true;
btnMode2.buttonMode = true;
btnMode2.position.set(1120, 500);
app.stage.addChild(btnMode2);
btnMode2.on("pointerdown", () => {
  app.stage.removeChild(welcomeBackground);
  app.stage.removeChild(btnMode1);
  app.stage.removeChild(btnMode2);
  const help = PIXI.Sprite.from("./resources/images/help-mode2.png");
  help.interactive = true;
  help.buttonMode = true;
  app.stage.addChild(help);
  help.on("pointerdown", () => {
    app.stage.removeChild(help);
    start(1, 60 * 1.02);
  });
});
// start();

function start(sameConnectedNumber = 3, randomGrowTime = 60 * 2) {
  const score = ref<number>(0);
  const buildingDestroyScore = 100;
  const comboEliminationScore = 60;

  // Regions
  const regions = [
    {
      name: "euro",
      // left, middle, right
      districts: [
        {
          order: 1,
          steps: [[], ["euro-01"], ["euro-05"], ["euro-08"]],
        },
        {
          order: 2,
          steps: [[], ["euro-03"], ["euro-06"], ["euro-09"], ["euro-10"]],
        },
        {
          order: 0,
          steps: [[], ["euro-02"], ["euro-04"], ["euro-07"]],
        },
      ],
    },
    {
      name: "egypt",
      districts: [
        {
          order: 1,
          steps: [
            ["egypt-03"],
            ["egypt-01"],
            ["egypt-05"],
            ["egypt-06"],
            ["egypt-07"],
          ],
        },
        {
          order: 2,
          steps: [
            ["egypt-03"],
            ["egypt-02"],
            ["egypt-11"],
            ["egypt-12"],
            ["egypt-13"],
          ],
        },
        {
          order: 0,
          steps: [
            ["egypt-03"],
            ["egypt-04"],
            ["egypt-08"],
            ["egypt-09"],
            ["egypt-10"],
          ],
        },
      ],
    },
    {
      name: "china",
      districts: [
        {
          order: 2,
          steps: [
            ["china-13"],
            ["china-10", "china-13"],
            ["china-07", "china-13"],
            ["china-04", "china-13"],
            ["china-01", "china-13"],
          ],
        },
        {
          order: 1,
          steps: [
            ["china-13"],
            ["china-11", "china-13"],
            ["china-08", "china-13"],
            ["china-05", "china-13"],
            ["china-02", "china-13"],
          ],
        },
        {
          order: 0,
          steps: [
            ["china-13"],
            ["china-12", "china-13"],
            ["china-09", "china-13"],
            ["china-06", "china-13"],
            ["china-03", "china-13"],
          ],
        },
      ],
    },
  ];

  // Earth
  const earthSurface = 450;
  const earthCenter: [number, number] = [1790, 911];
  const regionRotation = (35 / 90) * (Math.PI / 2);
  const regionBuildingOffset = Math.PI / 6;
  const bestStepRotation = Math.PI / 4;
  const randomGrowProbability = 0.5;
  const earth = PIXI.Sprite.from("./resources/images/earth.compress.png");
  earth.anchor.set(0.367, 0.5);
  earth.position.set(earthCenter[0], earthCenter[1]);
  earth.scale.set(0.5 * 2);
  app.stage.addChild(earth);
  const regionItems: Array<Array<Array<PIXI.Sprite[]>>> = regions.map(
    (region) => {
      const regionImages = region.districts.map(
        () => [] as Array<PIXI.Sprite[]>
      );
      const indices = region.districts.map((v, i) => i);
      indices.sort(
        (a, b) => region.districts[b].order - region.districts[a].order
      );
      for (const index of indices) {
        regionImages[index] = region.districts[index].steps.map((images) =>
          images.map((path) => {
            const item = PIXI.Sprite.from(
              `./resources/images/${region.name}/${path}.png.compress.png`
            );
            item.anchor.set(0.367, 0.5);
            item.position.set(earthCenter[0], earthCenter[1]);
            item.scale.set(0.5 * 2);
            app.stage.addChild(item);
            return item;
          })
        );
      }
      return regionImages;
    }
  );
  const regionMaxHp = 6;
  let regionHp = regionMaxHp;
  const regionSteps: Array<number[]> = regions.map((region) =>
    region.districts.map(() => 1)
  );

  const regionRecoverInterval = 60 * 40;
  let regionAccTime = 0;
  app.ticker.add((dt) => {
    regionAccTime += dt;
    if (regionAccTime > regionRecoverInterval) {
      regionAccTime -= regionRecoverInterval;
      if (regionHp < regionMaxHp) {
        regionHp += 1;
        updateEnvironmentHealth();
      }
    }
  });

  function updateEarth() {
    for (let i = 0; i < regions.length; ++i) {
      const districts = regions[i].districts;
      for (let j = 0; j < districts.length; ++j) {
        const steps = districts[j].steps;
        for (let k = 0; k < steps.length; ++k) {
          const visible = k == regionSteps[i][j];
          regionItems[i][j][k].forEach((image) => {
            image.visible = visible;
          });
        }
      }
    }
  }

  function rotateEarthDelta(delta: number) {
    for (let i = 0; i < regions.length; ++i) {
      const districts = regions[i].districts;
      for (let j = 0; j < districts.length; ++j) {
        const steps = districts[j].steps;
        for (let k = 0; k < steps.length; ++k) {
          regionItems[i][j][k].forEach((item) => {
            item.rotation += delta;
          });
        }
      }
    }
    earth.rotation += delta;
  }

  function earthRotation(): number {
    return regionItems[0][0][1][0].rotation;
  }

  updateEarth();
  let growTime = 0;
  app.ticker.add((dt) => {
    growTime += dt;
    if (growTime >= randomGrowTime) {
      growTime -= randomGrowTime;
      if (Math.random() < randomGrowProbability) {
        // Now grow a building
        const distances = regions.map((v, i) => {
          const regionDirection =
            regionRotation -
            regionBuildingOffset +
            earthRotation() -
            i * ((2 * Math.PI) / regions.length);
          let distance = (regionDirection - bestStepRotation) % (2 * Math.PI);
          if (distance < 0) {
            distance += 2 * Math.PI;
          }
          return Math.min(distance, 2 * Math.PI - distance);
        });
        let minIndex = 0;
        for (let i = 1; i < distances.length; ++i) {
          if (distances[minIndex] > distances[i]) {
            minIndex = i;
          }
        }
        const district = Math.floor(
          Math.random() * regionSteps[minIndex].length
        );
        if (
          regionSteps[minIndex][district] + 1 <
          regions[minIndex].districts[district].steps.length
        ) {
          regionSteps[minIndex][district] += 1;
          updateEarth();
          updateDevelopmentHealth();
        }
        if (
          regionSteps[minIndex].every(
            (step, i) =>
              step + 1 === regions[minIndex].districts[i].steps.length
          )
        ) {
          die();
        }
      }
    }
  });

  // Earth rotate
  const earthDrag = ref<[number, number] | null>(null);
  const interactionManager = new PIXI.InteractionManager(app.renderer);
  interactionManager.on("pointerdown", (event) => {
    const newX = event.data.global.x;
    const newY = event.data.global.y;
    const centerX = earthCenter[0];
    const centerY = earthCenter[1];
    if (newX == centerX && newY == centerY) {
      return;
    }
    earthDrag.value = [newX, newY];
  });
  interactionManager.on("pointerup", () => {
    earthDrag.value = null;
  });
  interactionManager.on("pointerupoutside", () => {
    earthDrag.value = null;
  });
  interactionManager.on("pointermove", (event) => {
    if (earthDrag.value !== null) {
      const newX = event.data.global.x;
      const newY = event.data.global.y;
      const centerX = earthCenter[0];
      const centerY = earthCenter[1];
      if (newX == centerX && newY == centerY) {
        return;
      }
      const [oldX, oldY] = earthDrag.value;
      earthDrag.value = [newX, newY];
      const deltaAngle =
        Math.atan2(newY - centerY, newX - centerX) -
        Math.atan2(oldY - centerY, oldX - centerX);
      rotateEarthDelta(deltaAngle);
      placeAllDroppedItem();
    }
  });

  // God
  const godReady = PIXI.Sprite.from("./resources/images/god-01.png");
  const godThrow = PIXI.Sprite.from("./resources/images/god-02.png");
  [godReady, godThrow].forEach((god) => {
    god.anchor.set(0);
    god.position.set(0, 0);
    god.scale.set(0.6);
    app.stage.addChild(god);
  });
  const godTriggered = ref<boolean>(false);
  watchEffect(() => {
    if (godTriggered.value) {
      godReady.visible = false;
      godThrow.visible = true;
    } else {
      godReady.visible = true;
      godThrow.visible = false;
    }
  });

  const resources: Array<{
    type: ItemType;
    path: string;
  }> = [
    {
      type: "fire",
      path: "./resources/images/res-fire.png",
    },
    {
      type: "chemistry",
      path: "./resources/images/res-chemistry.png",
    },
    {
      type: "radiation",
      path: "./resources/images/res-radiation.png",
    },
    {
      type: "biology",
      path: "./resources/images/res-biology.png",
    },
    {
      type: "battery",
      path: "./resources/images/res-battery.png",
    },
  ];
  const resourceCtor = (x: number) => {
    const item = PIXI.Sprite.from(resources[x].path);
    item.anchor.set(0.5);
    item.scale.set(0.5);
    return item;
  };
  // const specials: Array<{
  //   type: ItemType;
  //   path: string;
  // }> = [
  //   {
  //     type: "monster",
  //     path: "./resources/images/special-monster.png",
  //   },
  //   {
  //     type: "storm",
  //     path: "./resources/images/special-storm.png",
  //   },
  //   {
  //     type: "wave",
  //     path: "./resources/images/special-wave.png",
  //   },
  // ];
  // const specialCtor = (x: number) => {
  //   const item = PIXI.Sprite.from(specials[x].path);
  //   item.anchor.set(0.5);
  //   item.scale.set(0.5);
  //   return item;
  // };

  // Candidates
  const candidateSlots = [
    {
      x: 1869,
      y: 623,
      scale: 0.3,
    },
    {
      x: 1789,
      y: 632,
      scale: 0.3,
    },
    {
      x: 1716,
      y: 657,
      scale: 0.3,
    },
    {
      x: 1651,
      y: 692,
      scale: 0.3,
    },
    {
      x: 1588,
      y: 754,
      scale: 0.3,
    },
    {
      x: 1790,
      y: 911,
      scale: 1.2,
    },
  ];
  const candidates: Array<[ItemType, PIXI.Sprite]> = Array.apply(
    null,
    Array(candidateSlots.length)
  ).map(() => nextItem());
  const candidateBackground = PIXI.Sprite.from(
    "./resources/images/candidates.png"
  );
  candidateBackground.scale.set(0.4);
  candidateBackground.anchor.set(1.0);
  candidateBackground.position.set(1920, 1080);
  app.stage.addChild(candidateBackground);

  function updateCandidates() {
    for (let i = 0; i < candidateSlots.length; ++i) {
      const candidate = candidates[i][1];
      candidate.position.set(candidateSlots[i].x, candidateSlots[i].y);
      candidate.scale.set(candidateSlots[i].scale);
    }
  }

  updateCandidates();
  candidates.forEach((x) => app.stage.addChild(x[1]));

  // Items
  type ItemType =
    | "battery"
    | "biology"
    | "chemistry"
    | "fire"
    | "radiation"
    | "monster"
    | "storm"
    | "wave";

  function isSpecial(kind: ItemType): boolean {
    return kind == "monster" || kind == "storm" || kind == "wave";
  }

  interface ItemTreeNode {
    x: number;
    y: number;
    id: number;
  }

  const itemTree = new kdTree(
    [] as Array<ItemTreeNode>,
    (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)),
    ["x", "y"]
  );
  const itemInitPos: [number, number] = [300, 200];
  const itemMoveSpeed = 32;
  const itemRotateSpeed = 8;
  const itemRadius = 45;

  function tickItem(type: ItemType, item: PIXI.Sprite): (dt: number) => void {
    const special: boolean = isSpecial(type);
    const rotateDirection = Math.random() < 0.5 ? 1 : -1;

    function tick(dt: number): void {
      const targetX = earthCenter[0];
      const targetY = earthCenter[1];
      const deltaX = targetX - item.position.x;
      const deltaY = targetY - item.position.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const unitX = deltaX / distance;
      const unitY = deltaY / distance;
      const newX = item.position.x + itemMoveSpeed * dt * unitX;
      const newY = item.position.y + itemMoveSpeed * dt * unitY;
      const newDistance = Math.sqrt(
        Math.pow(targetX - newX, 2) + Math.pow(targetY - newY, 2)
      );
      const cosRotation = Math.cos(earthRotation());
      const sinRotation = Math.sin(earthRotation());
      const w2eRotate = [
        [cosRotation, sinRotation],
        [-sinRotation, cosRotation],
      ];
      const word2earth = (x: number, y: number) => ({
        x: w2eRotate[0][0] * (x - targetX) + w2eRotate[0][1] * (y - targetY),
        y: w2eRotate[1][0] * (x - targetX) + w2eRotate[1][1] * (y - targetY),
      });
      const e2wRotate = [
        [cosRotation, -sinRotation],
        [sinRotation, cosRotation],
      ];
      const earth2word = (x: number, y: number) => ({
        x: e2wRotate[0][0] * x + e2wRotate[0][1] * y + targetX,
        y: e2wRotate[1][0] * x + e2wRotate[1][1] * y + targetY,
      });
      // Detect collision to other items
      if (!special) {
        const nearestItem = itemTree.nearest(
          {
            id: 0,
            ...word2earth(newX, newY),
          },
          1,
          1920
        );
        if (nearestItem.length && nearestItem[0][1] < 2 * itemRadius) {
          const nearestCoord = earth2word(
            nearestItem[0][0].x,
            nearestItem[0][0].y
          );
          const nearestX = nearestCoord.x;
          const nearestY = nearestCoord.y;
          const nearestDistance =
            Math.abs(
              targetX * (newY - nearestY) +
                newX * (nearestY - targetY) +
                nearestX * (targetY - newY)
            ) /
            Math.sqrt(
              Math.pow(targetX - newX, 2) + Math.pow(targetY - newY, 2)
            );
          const maxOverlapOffset = Math.sqrt(
            Math.pow(targetX - nearestX, 2) +
              Math.pow(targetY - nearestY, 2) -
              nearestDistance * nearestDistance
          );
          const expectOffset = Math.sqrt(
            4 * itemRadius * itemRadius - nearestDistance * nearestDistance
          );
          const currentOffset = Math.sqrt(
            Math.pow(nearestX - newX, 2) +
              Math.pow(nearestY - newY, 2) -
              nearestDistance * nearestDistance
          );
          const undoOffset =
            maxOverlapOffset <= newDistance
              ? expectOffset - currentOffset
              : expectOffset + currentOffset;
          const finalX = newX - undoOffset * unitX;
          const finalY = newY - undoOffset * unitY;
          app.ticker.remove(tick);
          item.position.set(finalX, finalY);
          dropItem(
            type,
            item,
            nearestItem[0][0].id,
            word2earth(finalX, finalY)
          );
          return;
        }
      }
      // Detect collision to earth
      if (newDistance < earthSurface) {
        const finalX = newX - (earthSurface - newDistance) * unitX;
        const finalY = newY - (earthSurface - newDistance) * unitY;
        app.ticker.remove(tick);
        item.position.set(finalX, finalY);
        dropItem(type, item, null, word2earth(finalX, finalY));
        return;
      }
      item.position.set(newX, newY);
      item.angle += rotateDirection * itemRotateSpeed * dt;
    }

    return tick;
  }

  function pushItem(type: ItemType, item: PIXI.Sprite) {
    item.position.set(...itemInitPos);
    item.scale.set(0.5);
    item.rotation = Math.random() * (2 * Math.PI);
    app.stage.addChild(item);
    app.ticker.add(tickItem(type, item));
  }

  function nextItem(): [ItemType, PIXI.Sprite] {
    // const isSpecial = Math.random() >= 0.9;
    // if (!isSpecial) {
    //   const guess = Math.floor(Math.random() * resources.length);
    //   return [resources[guess].type, resourceCtor(guess)];
    // } else {
    //   const guess = Math.floor(Math.random() * specials.length);
    //   return [specials[guess].type, specialCtor(guess)];
    // }
    const guess = Math.floor(Math.random() * resources.length);
    return [resources[guess].type, resourceCtor(guess)];
  }

  const itemInterval = 120;
  const godTriggerDuration = 6;
  let itemAccTime = 0;
  app.ticker.add((dt) => {
    itemAccTime += dt;
    if (itemAccTime > godTriggerDuration && godTriggered.value) {
      godTriggered.value = false;
    }
    if (itemAccTime > itemInterval) {
      itemAccTime -= itemInterval;
      godTriggered.value = true;
      const newItem = nextItem();
      candidates.splice(0, 0, newItem);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      pushItem(...candidates.pop()!);
      updateCandidates();
      app.stage.addChild(newItem[1]);
    }
  });

  // Explode
  const explodeArray: PIXI.Texture[] = [...Array(15).keys()].map((n) =>
    PIXI.Texture.from(
      `./resources/images/explode/explode-${String(n).padStart(2, "0")}.png`
    )
  );

  // Dropped items
  const minDistanceToGod = 300;

  interface DroppedItem {
    theta: number;
    radius: number;
    type: ItemType;
    item: PIXI.Sprite;
    node: ItemTreeNode;
    parent: number | null;
    children: number[];
  }

  let maxId = 0;
  const droppedItems: Record<number, DroppedItem> = {};

  function dropItem(
    type: ItemType,
    item: PIXI.Sprite,
    parent: number | null,
    position: { x: number; y: number }
  ): void {
    if (isSpecial(type)) {
      // TODO: effect
      app.stage.removeChild(item);
      return;
    }
    const centerX = earthCenter[0];
    const centerY = earthCenter[1];
    let theta =
      Math.atan2(item.position.y - centerY, item.position.x - centerX) -
      earthRotation();
    let radius = Math.sqrt(
      Math.pow(item.position.x - centerX, 2) +
        Math.pow(item.position.y - centerY, 2)
    );
    theta = theta % (2 * Math.PI);
    if (theta < 0) {
      theta = (theta % (2 * Math.PI)) + 2 * Math.PI;
    }
    const id = maxId++;
    const node = {
      id,
      ...position,
    };
    const droppedItem = {
      theta,
      radius,
      type,
      item,
      node,
      parent,
      children: [],
    };
    droppedItems[id] = droppedItem;
    if (parent != null) {
      droppedItems[parent].children.push(id);
    }
    itemTree.insert(node);
    placeDroppedItem(droppedItem);
    if (
      Math.sqrt(
        Math.pow(item.position.x - itemInitPos[0], 2) +
          Math.pow(item.position.y - itemInitPos[1], 2)
      ) <= minDistanceToGod
    ) {
      die();
    }
    detectConnectedItem(id);
  }

  function placeDroppedItem(item: DroppedItem) {
    const posX =
      item.radius * Math.cos(earthRotation() + item.theta) + earthCenter[0];
    const posY =
      item.radius * Math.sin(earthRotation() + item.theta) + earthCenter[1];
    item.item.position.set(posX, posY);
  }

  function traversalDown(id: number): number[] {
    const item = droppedItems[id];
    const type = item.type;
    const results = [];
    for (const child of item.children) {
      if (droppedItems[child].type === type) {
        results.push(...traversalDown(child));
      }
    }
    results.push(id);
    return results;
  }

  function detectConnectedItem(id: number) {
    const type = droppedItems[id].type;
    let current = id;
    for (;;) {
      const parent = droppedItems[current].parent;
      if (parent === null || droppedItems[parent].type !== type) {
        break;
      }
      current = parent;
    }
    const component = traversalDown(current);
    score.value += comboEliminationScore * component.length;
    // Compute angle
    const avgX =
      component
        .map((id) => droppedItems[id].item.position.x)
        .reduce((a, b) => a + b, 0) / component.length;
    const avgY =
      component
        .map((id) => droppedItems[id].item.position.y)
        .reduce((a, b) => a + b, 0) / component.length;
    let angle =
      -(
        Math.atan2(avgY - earthCenter[1], avgX - earthCenter[0]) -
        earthRotation() -
        regionRotation
      ) %
      (2 * Math.PI);
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    angle /= 2 * Math.PI;
    const region = Math.floor(angle * regions.length);
    const angleInRegion = angle * regions.length - region;
    const isCity = angleInRegion <= 0.5;
    if (isCity && component.length < sameConnectedNumber) {
      return;
    }
    // Remove node
    for (const id of component) {
      const item = droppedItems[id];
      const children = item.children.slice();
      children.reverse();
      for (const child of children) {
        disconnectItem(child);
      }
      if (item.parent !== null) {
        const index = droppedItems[item.parent].children.indexOf(id);
        droppedItems[item.parent].children.splice(index, 1);
      }
      delete droppedItems[id];
      itemTree.remove(item.node);
      app.stage.removeChild(item.item);
      // Create explode
      const explode = new PIXI.AnimatedSprite(explodeArray);
      explode.anchor.set(0.5);
      explode.position.set(item.item.position.x, item.item.position.y);
      explode.loop = false;
      explode.onComplete = () => {
        app.stage.removeChild(explode);
      };
      app.stage.addChild(explode);
      explode.play();
    }
    // Decrease level
    if (isCity) {
      const district = Math.floor(
        (1 - angleInRegion * 2) * regions[region].districts.length
      );
      if (regionSteps[region][district] > 0) {
        regionSteps[region][district] -= 1;
        score.value += buildingDestroyScore;
        updateEarth();
        updateDevelopmentHealth();
      }
    } else {
      regionHp -= 1;
      updateEnvironmentHealth();
      if (regionHp === 0) {
        die();
      }
    }
  }

  function disconnectItem(id: number) {
    const item = droppedItems[id];
    const children = item.children.slice();
    children.reverse();
    for (const child of children) {
      disconnectItem(child);
    }
    app.ticker.add(tickItem(item.type, item.item));
    if (item.parent !== null) {
      const index = droppedItems[item.parent].children.indexOf(id);
      droppedItems[item.parent].children.splice(index, 1);
    }
    delete droppedItems[id];
    itemTree.remove(item.node);
  }

  function placeAllDroppedItem() {
    Object.values(droppedItems).forEach(placeDroppedItem);
  }

  // Health
  const environmentHealth = new PIXI.Graphics();
  environmentHealth.beginFill(0x80d935);
  environmentHealth.drawRect(0, -19, 200, 38);
  environmentHealth.position.set(144, 924);
  app.stage.addChild(environmentHealth);
  environmentHealth.transform.scale.set(1.0, 1.0);

  const developmentHealth = new PIXI.Graphics();
  developmentHealth.beginFill(0x87c2f5);
  developmentHealth.drawRect(0, -19, 200, 38);
  developmentHealth.position.set(144, 1020);
  app.stage.addChild(developmentHealth);
  developmentHealth.transform.scale.set(1.0, 1.0);

  const health = PIXI.Sprite.from("./resources/images/health.png");
  health.anchor.set(0, 1);
  health.position.set(0, 1080);
  health.scale.set(1.5);
  app.stage.addChild(health);

  function updateEnvironmentHealth() {
    const progress = regionHp / regionMaxHp;
    environmentHealth.transform.scale.set(progress, 1.0);
  }

  function updateDevelopmentHealth() {
    const progress = Math.max(
      ...regionSteps.map(
        (v, i) =>
          v.reduce((a, b) => a + b, 0) /
          regions[i].districts
            .map((district) => district.steps.length - 1)
            .reduce((a, b) => a + b, 0)
      )
    );
    developmentHealth.transform.scale.set(1.0 - progress, 1.0);
  }

  updateDevelopmentHealth();

  // Score
  const scoreText = new PIXI.Text("0", {
    fontFamily: "ArtHistoryBook",
    fontSize: 120,
    fill: 0,
    align: "right",
  });
  scoreText.anchor.set(1, 0);
  scoreText.position.set(1920 - 50, 50);
  app.stage.addChild(scoreText);

  watchEffect(() => {
    scoreText.text = `${score.value}`;
  });

  // Die
  const failure = PIXI.Sprite.from("./resources/images/failure.compress.png");
  failure.anchor.set(0.5);
  failure.position.set(960, 540);
  failure.scale.set(0.4 * 2);

  function die() {
    app.stage.addChild(failure);
    app.ticker.stop();
  }
}
</script>

<style lang="scss">
@font-face {
  font-family: "ArtHistoryBook";
  src: url("assets/fonts/art-history-book.otf");
}

html,
body {
  margin: 0;
  background-color: black;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

#game {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  canvas {
    max-height: 100%;
    width: auto;
  }
}

#controls {
  position: relative;
  bottom: 48px;
  width: 100%;
  display: flex;
  justify-content: center;

  & > div {
    padding: 4px 8px;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: space-around;

    & > button {
      color: white;
      background-color: unset;
      border: none;
      outline: none;
      font-size: 16px;
      width: 24px;
      height: 24px;
    }
  }
}
</style>
