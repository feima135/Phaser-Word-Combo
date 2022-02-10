class CoinShowerBonusGame extends Phaser.Scene {

  constructor() {
    super('CoinShowerBonusGame')
  }

  create() {
    this.levelDuration = 50000;
    this.dispatchInterval = 100;

    this.add.image(config.width / 2, config.height / 2, "GameMonsterBG").setScale(1, 1);

    this.parseData();

    this.activateCoinShower();

    this.scene.get('GameScene').genericCreateTimer(this.levelDuration, this);

    this.scene.get('GameScene').genericGameSceneInit(this);
  }

  update() {
    this.scene.get('GameScene').genericGameSceneUpdate(this);
  }

  // populate spawn data from XML
  parseData() {
    this.spawnTableInfo = [];

    const spawnInfoData = this.cache.xml.get('CoinShowerLevelInfo');

    const spawnInfoTable = spawnInfoData.getElementsByTagName('Spawn');

    let currRNGValue = 0.0; // for counting min max, a running count
    Array.from(spawnInfoTable).forEach(info => {

      let rngThreshold = parseFloat(info.getAttribute("RNGSpawn"));

      let spawnInfo = {
        RNGThresholdMin: currRNGValue,
        RNGThresholdMax: currRNGValue + rngThreshold,
        ID: info.getAttribute("ID"),
        Payout: info.getAttribute("Payout"),
        Freeze: info.getAttribute("Freeze")
      }

      this.spawnTableInfo.push(spawnInfo);

      currRNGValue += rngThreshold;
    });
  }

  // dispatch collectable, could be coin, gems or bombs etc
  dispatchItem() {
    let bufferItemWorldSize = 30;

    // randomly select a drop start pt and speed
    let spawnPosX = Phaser.Math.FloatBetween(bufferItemWorldSize, config.width - bufferItemWorldSize);
    let randomFallDuration = Phaser.Math.FloatBetween(3500, 8000);
    let randomStartDelay = Phaser.Math.FloatBetween(0, 2000);
    let startY = -bufferItemWorldSize * 3;
    let finalY = config.height + bufferItemWorldSize;

    // random select type to drop

    let selectableItem = this.add.image(spawnPosX, startY, "Coin").setScale(0.5);
    selectableItem.setInteractive();
    selectableItem.on('pointerdown', this.scene.get('GameScene').buttonAnimEffect.bind(this, selectableItem,
      () => {
        this.onSelectableItemClicked(selectableItem);
      }));

    // set the random type
    let spawnRNG = Phaser.Math.FloatBetween(0, 1);
    for (var rngIndex = 0; rngIndex < this.spawnTableInfo.length; ++rngIndex) {
      let currSpawnItemData = this.spawnTableInfo[rngIndex];

      if (spawnRNG >= currSpawnItemData.RNGThresholdMin && spawnRNG < currSpawnItemData.RNGThresholdMax) {
        selectableItem.setTexture(currSpawnItemData.ID);
        selectableItem.payout = parseInt(currSpawnItemData.Payout);
        selectableItem.freezeType = parseInt(currSpawnItemData.Freeze);
      }
    }

    // drop down tween anim
    let targetTween = this.add.tween({
      targets: selectableItem,
      y: { from: startY, to: finalY },
      ease: "Cubic.In",
      onCompleteScope: this,
      startDelay: randomStartDelay,
      onComplete: function () {
        selectableItem.destroy();
      },
      duration: randomFallDuration
    });

    selectableItem.tweenRef = targetTween;
  }

  activateCoinShower() {

    // dispatch routine
    this.add.tween({
      targets: this,
      onLoopScope: this,
      loop: -1,
      loopDelay: this.dispatchInterval,
      onLoop: function () {
        this.dispatchItem();
      },
    });
  }

  onSelectedPenaltyItem(selectedItem) {
    // create bomb explosion
    let explosionSprite = this.add.sprite(selectedItem.x, selectedItem.y, "Explosion");
    this.anims.create({
      key: "Explosion",
      frames: this.anims.generateFrameNumbers('Explosion',
        { start: 0, end: 9 }),
      frameRate: 20,
    });
    explosionSprite.play("Explosion");
    explosionSprite.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
      explosionSprite.destroy();
    })

    selectedItem.destroy();
    this.scene.get('GameScene').genericDeductTimer(selectedItem.payout, this);
  }

  onSelectedPayoutItem(selectedItem) {
    let targetPos = this.scene.get('GameScene').ScoreText;

    // payout text, pulse and disappear
    let payoutText = this.add.text(selectedItem.x, selectedItem.y, selectedItem.payout, { font: '32px Arial', fill: "#F8FD38", align: 'center' });
    payoutText.setStroke('#fff', 3);
    payoutText.setOrigin(0.5);

    let sceneRef = this;

    this.add.tween({
      targets: payoutText,
      scaleX: 3,
      scaleY: 3,
      duration: 100,
      completeDelay: 0,
      onComplete: function () {

        // fade out the text
        sceneRef.add.tween({
          targets: payoutText,
          alpha: { from: 1, to: 0.0 },
          duration: 800,
          onComplete: function () {
            payoutText.destroy();
          },
        });
      },

      yoyo: true
    });

    // pulse glow
    let sparkle = this.add.sprite(selectedItem.x, selectedItem.y, "Sparkle").setScale(2., 2.);
    this.anims.create({
      key: "Sparkle",
      frames: this.anims.generateFrameNumbers('Sparkle',
        { start: 0, end: 15 }),
      frameRate: 60,
    });
    sparkle.play("Sparkle");
    sparkle.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
      sparkle.destroy();
    });

    // shrink the flyover
    this.add.tween({
      targets: selectedItem,
      scaleX: selectedItem.scaleX * .7,
      scaleY: selectedItem.scaleX * .7,
      duration: 200
    });

    // flyover and self destruct
    this.add.tween({
      targets: selectedItem,
      onCompleteScope: this,
      delay: 100,
      x: targetPos.x,
      y: targetPos.y,
      ease: "Back.easeInOut",
      onComplete: function () {

        if (selectedItem.payout > 0) {
          this.scene.get('GameScene').genericUpdateGlobalScore(selectedItem.payout, this);
        }
        selectedItem.destroy();
      },
      duration: 800
    });
  }

  onSelectedFreezeItem(selectableItem)
  {
    // show freeze overlay
    // let explosionSprite = this.add.sprite(selectedItem.x, selectedItem.y, "Explosion");
    // this.anims.create({
    //   key: "Explosion",
    //   frames: this.anims.generateFrameNumbers('Explosion',
    //     { start: 0, end: 9 }),
    //   frameRate: 20,
    // });
    // explosionSprite.play("Explosion");

    // explosionSprite.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
    //   explosionSprite.destroy();
    // })

    this.tweens.timeScale = 0.5;

    this.tweens.addCounter({
      from: 1,
      to: 0.5,
      duration: 5000,
      onUpdate: function (tween) {
        this.tweens.timeScale = tween.getValue();
      }
    });

    selectedItem.destroy();
  }

  // when selectable item gets clicked
  onSelectableItemClicked(selectedItem) {

    // all will stop the falling
    selectedItem.tweenRef.stop();
    this.children.bringToTop(selectedItem);

    // a penalty fly to timer bar
    if (selectedItem.payout < 0) {
      this.onSelectedPenaltyItem(selectedItem);
    }
    else if (selectedItem.payout > 0) {
      this.onSelectedPayoutItem(selectedItem);
    }
    else if(selectableItem.freezeType > 0){
      this.onSelectedFreezeItem(selectedItem);
    }
  }
}