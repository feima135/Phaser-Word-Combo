class CoinShowerBonusGame extends Phaser.Scene {

  constructor() {
    super('CoinShowerBonusGame')
  }

  create() {

    this.freezeMode = false;
    this.levelDuration = 50000;
    this.dispatchInterval = 100;

    
    this.add.image(config.width / 2, config.height / 2, "GameMonsterBG").setScale(1, 1);

    this.guessWordComboBG = this.add.image(config.width * 0.85, config.height * 0.13, "GuessWordComboBG").setScale(.22, .22);

    this.freezeOverlay = this.add.image(config.width / 2, config.height / 2, "FreezeEffectOverlay").setScale(1, 1);
    this.freezeOverlay.alpha = 0.0;

    this.parseData();

    this.scene.get('GameScene').genericCreateTimer(this.levelDuration, this);

    this.scene.get('GameScene').genericGameSceneInit(this);

    // bypass intro splash
    this.activateCoinShower();
    this.generateBonusWordComboPrize();

    // // intro splash
    // this.scene.get('GameScene').genericSplashSummary(this, "Game Start", "qqqq", false, ()=>
    // {
    //   this.activateCoinShower();
      
    //   this.generateBonusWordComboPrize();
    // });
  }

  update() {
    this.scene.get('GameScene').genericGameSceneUpdate(this);

    this.guessWordComboBG.depth = 1;
    //this.children.bringToTop(this.guessWordComboBG);
  }

  // generate a random word combo question
  // if player picks correct missing words, award big prize
  generateBonusWordComboPrize()
  {
    let randomWordCombo = Phaser.Utils.Array.GetRandom(this.wordComboPool);

    randomWordCombo = randomWordCombo.replace('_' , "");
    console.log(randomWordCombo);

    let depth = this.guessWordComboBG.depth;

    let currWord = this.add.text(this.guessWordComboBG.x, this.guessWordComboBG.y + 20, randomWordCombo, { font: '50px KaiTi', fill: "#F8FD38" });
    currWord.setOrigin(0.5);
    currWord.depth = depth + 1;
    this.children.bringToTop(currWord);
  }

  onTimerExpired()
  {
    console.log("done");
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
        Freeze: info.getAttribute("Freeze"),
        WordCharacter : info.getAttribute("WordCharacter")
      }

      this.spawnTableInfo.push(spawnInfo);

      currRNGValue += rngThreshold;

      if (info.getAttribute("Animated"))
      {
        this.anims.create({
          key: spawnInfo.ID + "Anim",
          frames: this.anims.generateFrameNumbers(spawnInfo.ID,
            { start: 0, end: 2 }),
          frameRate:4,
          repeat: -1,
          yoyo: true
        });
      }
    });

    // all the single word
    this.wordCharacterPool = [];

    // all the word pairings
    this.wordComboPool = [];

    // harvest bonus chest words combo
    const wordsMatchTable = spawnInfoData.getElementsByTagName('WordsCombo');
    Array.from(wordsMatchTable).forEach(info => {

      let comboMasterString = info.getAttribute("combo");
      let wordPairing = comboMasterString.split(','); // 1 instance of example 炒_菜

      wordPairing.forEach(targetString => {

        this.wordComboPool.push(targetString);
  
        let wordPart = targetString.split('_'); // 1 instance of example 炒

        wordPart.forEach(item => this.wordCharacterPool.push(item));
      });
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

    // set the random type
    let maxRNG = this.spawnTableInfo[this.spawnTableInfo.length - 1].RNGThresholdMax;
    console.log(maxRNG);
    let spawnRNG = Phaser.Math.FloatBetween(0, maxRNG);

    for (var rngIndex = 0; rngIndex < this.spawnTableInfo.length; ++rngIndex) {
      let currSpawnItemData = this.spawnTableInfo[rngIndex];

      let spawnRNGSuccess = spawnRNG >= currSpawnItemData.RNGThresholdMin && spawnRNG < currSpawnItemData.RNGThresholdMax;
      if (spawnRNGSuccess) {

        let selectableItemRoot = this.add.container();
        let selectableItem = this.add.sprite(spawnPosX, startY, "WordCharacterBG").setScale(0.5);

        selectableItemRoot.add(selectableItem);

        // either add a text character or picked image 
        if (currSpawnItemData.WordCharacter) {

          let randomCharacter = Phaser.Utils.Array.GetRandom(this.wordCharacterPool);

          // chinese character round base
          selectableItem.wordCharacterObj = this.add.text(spawnPosX, startY, randomCharacter, { font: '42px KaiTi', fill: "#000", align: 'center' });
          selectableItem.wordCharacterObj.setOrigin(0.5);
          selectableItem.wordCharacterObj.word = randomCharacter;

          selectableItemRoot.add(selectableItem.wordCharacterObj);
        }
        else {
          selectableItem.setTexture(currSpawnItemData.ID);

          let targetAnimName = String(currSpawnItemData.ID + "Anim");
          if (this.anims.exists(targetAnimName)) {
            selectableItem.play(targetAnimName);
          }
        }

        selectableItem.setInteractive();
        selectableItem.on('pointerdown', this.scene.get('GameScene').buttonAnimEffect.bind(this, selectableItem,
          () => {
            this.onSelectableItemClicked(selectableItem);
          }));

        selectableItem.payout = parseInt(currSpawnItemData.Payout);
        selectableItem.freezeType = parseInt(currSpawnItemData.Freeze);

        // drop down tween anim
        let targetTween = this.add.tween({
          targets: selectableItemRoot,
          y: { from: startY, to: finalY },
          ease: "Cubic.In",
          onCompleteScope: this,
          startDelay: randomStartDelay,
          onComplete: function () {
            selectableItemRoot.destroy();
          },
          duration: randomFallDuration
        });

        selectableItem.tweenRef = targetTween;
      }
    }
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

  onSelectedFreezeItem(selectedItem)
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

    // freeze alreadt active just destroy it
    if(this.freezeMode)
    {
      selectedItem.destroy();
      return;
    }

    this.freezeMode = true;

    let freezeDuration = 2000;

    // fade in the freezeoverlay
    this.add.tween({
      targets: this.freezeOverlay,
      alpha: { from: 0, to: 1 },
      duration: 500,
    });

    this.tweens.addCounter({
      from: 1,
      to: 0.3,
      duration: 500,
      onUpdateScope: this,
      onCompleteScope: this,
      onUpdate: function (tween) {
        this.tweens.timeScale = tween.getValue();
      },
      completeDelay : freezeDuration,
      onComplete: function(tween)
      {
        // revert the freeze phase
        this.tweens.timeScale = 1.0;
        this.freezeMode = false;
        selectedItem.destroy();

        // fade out the overlay     
        this.add.tween({
          targets: this.freezeOverlay,
          alpha: { from: 1, to: 0 },
          duration: 500,
        });
      }
    });
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
    else if(selectedItem.freezeType > 0){
      this.onSelectedFreezeItem(selectedItem);
    }
  }
}