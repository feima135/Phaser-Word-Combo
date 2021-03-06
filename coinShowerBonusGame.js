class CoinShowerBonusGame extends Phaser.Scene {

  constructor() {
    super('CoinShowerBonusGame')
  }

  create() {

    this.freezeMode = false;

    this.add.image(config.width / 2, config.height / 2, "GameMonsterBG").setScale(1, 1);

    // Create guess word feature assets
    this.guessWordComboBG = this.add.image(config.width * 0.85, config.height * 0.13, "GuessWordComboBG").setScale(.22, .22);

    this.freezeOverlay = this.add.image(config.width / 2, config.height / 2, "FreezeEffectOverlay").setScale(1, 1);
    this.freezeOverlay.alpha = 0.0;

    this.parseData();

    this.scene.get('GameScene').genericGameSceneInit(this);

    // bypass intro splash
    //this.activateCoinShower();
    //this.generateBonusWordComboPrize();

    // intro splash
    this.scene.get('GameScene').genericSplashSummary(this, "游戏开始", "Bonus Game", "ExplainBonusGame", 5000, ()=>
    {
      this.scene.get('GameScene').genericCreateTimer(this.levelInfo.levelDuration, this, 100);

      this.activateCoinShower();
      
      this.generateBonusWordComboPrize();
    });
  }

  update() {
    this.scene.get('GameScene').genericGameSceneUpdate(this);

    this.guessWordComboBG.depth = 1;
  }

  // generate a random word combo question
  // if player picks correct missing words, award big prize
  generateBonusWordComboPrize()
  {
    if (this.guessWordComboBG.currWord) {
      this.guessWordComboBG.currWord.destroy();
    }

    let randomWordCombo = Phaser.Utils.Array.GetRandom(this.wordComboPool);

    //randomWordCombo = randomWordCombo.replace('_' , "");

    let depth = this.guessWordComboBG.depth;

    // now randomly pick 1 portion to be a guess portion
    let randomIndex = Phaser.Math.Between(0, randomWordCombo.length - 1);

    //console.log("random index " + randomIndex);

    // check for this chinese character 
    // could have other answers
    let mainGuessCharacter = randomWordCombo[randomIndex];
    this.possibleWordComboTargetTable = [];
    //this.currBonousWordComboTarget.push(mainGuessCharacter);

    // look up this.wordComboPool and see other similar instances
    this.wordComboPool.forEach(item => {
      //console.log("hmm" + item.charAt(randomIndex));

      // consider 炒饭 炒菜, mainguesscharacter 炒
      // consider 炒饭 vs 菜饭, mainguesscharacter 炒
      // its a match if the immediate next character matches
      let primaryMatch = item.charAt(randomIndex - 1) == randomWordCombo[randomIndex - 1];
      let secondaryMatch = item.charAt(randomIndex + 1) == randomWordCombo[randomIndex + 1];

      if (primaryMatch || secondaryMatch) {
        let potentialCharacter = item[randomIndex];
        let comboTargetSet =
        {
          character: potentialCharacter,
          correctAnswerCombo: item
        };

        if (!this.possibleWordComboTargetTable.includes(potentialCharacter)) {
          this.possibleWordComboTargetTable.push(comboTargetSet);
        }
      }
    });

    //console.log("mainword guessing" + randomWordCombo);
    //console.log("randomindex" + randomIndex);

    // this.possibleWordComboTargetTable.forEach(item => 
    // {
    // console.log("guessing" + item.character);
    // });

    let currWord = this.add.text(this.guessWordComboBG.x, this.guessWordComboBG.y + 20, randomWordCombo, { font: '50px KaiTi', fill: "#F8FD38" });
    currWord.setOrigin(0.5);
    currWord.depth = depth + 1;
    this.children.bringToTop(currWord);

    this.guessWordComboBG.currWord = currWord;

    // replace ? with index
    currWord.text = randomWordCombo.replace(mainGuessCharacter, "?");
    
    // generate a prize
    this.guessWordComboBG.prize = this.add.text(this.guessWordComboBG.x, this.guessWordComboBG.y - 18, 100, { font: '22px Arial', fill: "#000" });
    this.guessWordComboBG.prize.setStroke('#fff', 3);
    this.guessWordComboBG.prize.depth = this.guessWordComboBG.depth + 1;
    this.guessWordComboBG.prize.setOrigin(0.5);
    this.guessWordComboBG.prize.amount = this.scorePerComboWord * randomWordCombo.length;
    this.guessWordComboBG.prize.text = this.guessWordComboBG.prize.amount;
  }

  onTimerExpired()
  {
    this.tweens.timeScale = 1.0;
    this.freezeMode = false;

    this.scene.get('GameScene').genericSplashSummary(this, "游戏结束", "Bonus Level Complete", "", 3500, ()=>
    {
      this.scene.start('GameScene');
    });
  }
  
  // populate spawn data from XML
  parseData() {
    this.spawnTableInfo = [];

    const spawnInfoData = this.cache.xml.get('CoinShowerLevelInfo');

    const levelInfoDetail = spawnInfoData.getElementsByTagName('LevelInfoDetail');

    let levelInfo = {
      levelDuration : parseInt(levelInfoDetail[0].getAttribute("LevelDuration")),
      fallDuration : parseInt(levelInfoDetail[0].getAttribute("FallDuration")),
      fallVariance : parseInt(levelInfoDetail[0].getAttribute("FallDurationVariance")),
      dispatchInterval : parseInt(levelInfoDetail[0].getAttribute("DispatchInterval"))
    };

    this.levelInfo = levelInfo;

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
        WordCharacter : info.getAttribute("WordCharacter"),
        AudioName : info.getAttribute("audioName")
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

        targetString = targetString.trim();
        this.wordComboPool.push(targetString);

        let wordPart = targetString.split(''); // 1 instance of example 炒

        wordPart.forEach(item => {
          this.wordCharacterPool.push(item.trim());
        });
      });
    });

    const wordsComboFeatureInfo = spawnInfoData.getElementsByTagName('FeatureInfo');
    this.scorePerComboWord = wordsComboFeatureInfo[0].getAttribute("scorePerComboWord");
  }

  // dispatch collectable, could be coin, gems or bombs etc
  dispatchItem() {
    let bufferItemWorldSize = 30;

    // randomly select a drop start pt and speed
    let spawnPosX = Phaser.Math.FloatBetween(bufferItemWorldSize, config.width - bufferItemWorldSize);
    let randomFallDuration = Phaser.Math.FloatBetween(this.levelInfo.fallDuration - this.levelInfo.fallVariance, 
      this.levelInfo.fallDuration + this.levelInfo.fallVariance);

    let randomStartDelay = this.levelInfo.dispatchInterval;
    //let randomStartDelay = Phaser.Math.FloatBetween(0, this.levelInfo.dispatchInterval);
    let startY = -bufferItemWorldSize - 10;
    let finalY = config.height + bufferItemWorldSize;

    // random select type to drop

    // set the random type
    let maxRNG = this.spawnTableInfo[this.spawnTableInfo.length - 1].RNGThresholdMax;
    let spawnRNG = Phaser.Math.FloatBetween(0, maxRNG);

    for (var rngIndex = 0; rngIndex < this.spawnTableInfo.length; ++rngIndex) {
      let currSpawnItemData = this.spawnTableInfo[rngIndex];

      let spawnRNGSuccess = spawnRNG >= currSpawnItemData.RNGThresholdMin && spawnRNG < currSpawnItemData.RNGThresholdMax;
      if (spawnRNGSuccess) {

        let selectableItem = this.add.sprite(spawnPosX, startY, "Coin").setScale(0.5);
        selectableItem.setTexture(currSpawnItemData.ID);

        let movementTargets = [];
        movementTargets.push(selectableItem);

        // either add a text character or picked image 
        if (currSpawnItemData.WordCharacter) {
          let randomCharacter = Phaser.Utils.Array.GetRandom(this.wordCharacterPool);

          // chinese character round base
          selectableItem.wordCharacterObj = this.add.text(spawnPosX, startY, randomCharacter, { font: '42px KaiTi', fill: "#000", align: 'center' });
          selectableItem.wordCharacterObj.setOrigin(0.5);
          selectableItem.wordCharacterObj.word = randomCharacter;

          movementTargets.push(selectableItem.wordCharacterObj);
        }
        else {
          let targetAnimName = String(currSpawnItemData.ID + "Anim");
          if (this.anims.exists(targetAnimName)) {
            selectableItem.play(targetAnimName);
          }
        }

        //console.log(currSpawnItemData.AudioName);

        selectableItem.setInteractive();
        selectableItem.once('pointerdown', this.scene.get('GameScene').buttonAnimEffect.bind(this, selectableItem,
          () => {
            this.onSelectableItemClicked(selectableItem);
          }, currSpawnItemData.AudioName));

        selectableItem.payout = parseInt(currSpawnItemData.Payout);
        selectableItem.freezeType = parseInt(currSpawnItemData.Freeze);
        selectableItem.wordCharacterType = parseInt(currSpawnItemData.WordCharacter);

        // drop down tween anim
        let targetTween = this.add.tween({
          targets: movementTargets,
          y: { from: startY, to: finalY },
          ease: "Cubic.In",
          onCompleteScope: this,
          startDelay: randomStartDelay,
          onComplete: function () {
            
            movementTargets.forEach(item => item.destroy());

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
      loopDelay: this.levelInfo.dispatchInterval,
      //loopDelay: Phaser.Math.FloatBetween(0, this.levelInfo.dispatchInterval),
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

    selectedItem.disableInteractive();
    selectedItem.alpha = 0.5;
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

  onSelectedWordCharacter(selectedItem)
  {
    let targetPos = this.guessWordComboBG.currWord;

    let targetCombo;

    // check if it's correct
    let correctWord = false;
    this.possibleWordComboTargetTable.forEach(item => {
      if (item.character == selectedItem.wordCharacterObj.word) {
        targetCombo = item;
        correctWord = true;
      }
    });

    //check if correct
    if (selectedItem ) {
      if (correctWord && targetCombo != null) {
        selectedItem.depth = this.guessWordComboBG.depth + 2;
        selectedItem.wordCharacterObj.depth = selectedItem.depth + 1;

        // flyover and self destruct
        this.add.tween({
          targets: [selectedItem, selectedItem.wordCharacterObj],
          onCompleteScope: this,
          delay: 100,
          x: targetPos.x,
          y: targetPos.y,
          ease: "Back.easeInOut",
          // flyover from picked in scene to guessWordBG complete
          onComplete: function () {
            selectedItem.destroy();
            selectedItem.wordCharacterObj.destroy();

            this.sound.play("Correct_SFX");

            // flyover prize flyover and self destruct
            this.add.tween({
              targets: this.guessWordComboBG.prize,
              onCompleteScope: this,
              delay: 500,
              x: this.scene.get('GameScene').ScoreText.x,
              y: this.scene.get('GameScene').ScoreText.y,
              ease: "Back.easeInOut",
              onComplete: function () {
                this.scene.get('GameScene').genericUpdateGlobalScore(this.guessWordComboBG.prize.amount, this);
                this.guessWordComboBG.prize.destroy();

                // generate a new combo!
                this.generateBonusWordComboPrize();

              },
              duration: 1000
            });

            // reveal correct answer
            this.guessWordComboBG.currWord.text = targetCombo.correctAnswerCombo;
            
            this.scene.get('GameScene').genericPulseUIEffect(this, this.guessWordComboBG.currWord, 1.5, null);
          },
          duration: 800
        });
      }
      else{
        selectedItem.destroy();
        selectedItem.wordCharacterObj.destroy();
      }
    }
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
    else if(selectedItem.wordCharacterType > 0){
      this.onSelectedWordCharacter(selectedItem);
    }
  }
}