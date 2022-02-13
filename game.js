// global score
var g_Score = 0;
var g_ExpBaseScore = 0;
var g_LevelTime = 60000; // how long for each level in ms
var g_CurrLevelIndex = 0;
var g_TargetChineseFonts = "KaiTi";

// so questions are different when exiting and entering the bonus
var g_allQuestionsIDPool = [];
var g_allQuestionsCooldownIDPool = [];

/////////////////
// Game
/////////////////
class GameScene extends Phaser.Scene {

  constructor() {
    super('GameScene')
  }

  /////////////////
  //Read Level data, create drag boxes and link up
  /////////////////
  parseLevelData() {

    g_TargetChineseFonts = "PingFang";

    // if mobile device
    if(!this.sys.game.device.os.desktop)
    {
      this.add.text(400, 400, "mobile", { font: '32px Arial', fill: "#000" });
    }

    const levelInfo = this.cache.xml.get('LevelInfo');

    const levelInfoDataTable = levelInfo.getElementsByTagName('level');

    this.levelInfoTable = [];
    this.wordPartsPool = [];

    // iterate all level info
    Array.from(levelInfoDataTable).forEach(info => {

      let currLevelInfo = {
        levelID: info.getAttribute("levelID"),
        threshold: info.getAttribute("threshold"),
        partsToGuess: info.getAttribute("partsToGuess"),
        maxselectable: info.getAttribute("maxselectable"),
        penalizeWrongAns : parseInt(info.getAttribute("penalizeWrongAns"))
      };

      this.levelInfoTable.push(currLevelInfo);
    });

    // harvest all the possible word parts
    const globalInfo = levelInfo.getElementsByTagName('globalInfo');
    
    // let wordPartsStringData = globalInfo[0].getAttribute("worldPartInfoTable");
    // this.wordPartsPool = wordPartsStringData.split(',');
    // this.wordPartsPool.forEach(item => item.trim());

    const questions = levelInfo.getElementsByTagName('question');

    // iterate all possible questions
    Array.from(questions).forEach(questionData => {
      let currQuestion = {
        wordsComboTable: [], // hold string of possible word combos
        wordPartsBoxes: [], // pos and size
        wordParts: [], // first part is word index, next is atlas index 
        guessWordsIndices: [], // which word (index) is the target guess word
        wordPartsLeftToGuess: [], // atlas indicies of the remaining items left to guess
        audioTable: [],
        pinYinTable: []
      };

      // consolidate the words combo
      let wordsCombos = questionData.getElementsByTagName('wordsCombo');

      // each of the possible word combinations
      for (var wordComboIndex = 0; wordComboIndex < wordsCombos.length; ++wordComboIndex) {

        let wordCombo = wordsCombos[wordComboIndex];

        // save the guess word ID index
        let guessWordID = parseInt(wordCombo.getAttribute("guessWordID"));
        currQuestion.guessWordsIndices.push(guessWordID);

        // save the combo indices
        let wordData = wordCombo.getAttribute("word");
        currQuestion.wordsComboTable.push(wordData);

        // save the audio file name
        let audioName = wordCombo.getAttribute("audioName");
        currQuestion.audioTable.push(audioName);

        // save the pin yin
        let pinYinData = wordCombo.getAttribute("pinYin");
        currQuestion.pinYinTable.push(pinYinData);

        // let wordComboAtlasIndex = wordCombo.childNodes[0].nodeValue;

        // let isThisAGuessWord = wordCombo.getAttribute("guessWord");
        // if (isThisAGuessWord && isThisAGuessWord == "true") {
        //   currQuestion.guessWordsIndices.push(wordComboIndex);
        // }
        // currQuestion.wordsCombo.push(parseInt(wordComboAtlasIndex));

      }

      // consolidate the word part boxes combo
      let wordPartBoxes = questionData.getElementsByTagName('wordPartBox');
      Array.from(wordPartBoxes).forEach(wordPartBox => {
        let x = wordPartBox.getAttribute("x");
        let y = wordPartBox.getAttribute("y");
        let u = wordPartBox.getAttribute("u");
        let w = wordPartBox.getAttribute("w");
        let partInfo = wordPartBox.getAttribute("wordPartInfo");

        let boxInfo = new Phaser.Math.Vector4(x, y, u, w);
        currQuestion.wordPartsBoxes.push(boxInfo);
        currQuestion.wordParts.push(partInfo);

        // take this chance to collate the word parts
        this.wordPartsPool.push(partInfo);
      });

      this.allQuestions.push(currQuestion);
    });

    // prepare a random question + combo pool only the very first time
    if (g_allQuestionsIDPool.length == 0 && g_allQuestionsCooldownIDPool.length == 0) {
      for (var index = 0; index < this.allQuestions.length; ++index) {
        let currQuestion = this.allQuestions[index];
        for (var comboIndex = 0; comboIndex < currQuestion.wordsComboTable.length; ++comboIndex) {
          let savedID = index + "_" + comboIndex;
          g_allQuestionsIDPool.push(savedID)
        }
      }
    }
  }

  ////////////////////////////////
  // Panel of words for selection
  ////////////////////////////////
  createDragWordSelectables(targetQuestion) {
    Array.from(this.selectableWords).forEach(item => item.destroy());

    this.selectableWords.length = 0;

    let creationTable = [];

    // populate all rubbish first
    let randomRubbishTable = [];
    for (var index = 0; index < this.wordPartsPool.length; ++index) {
      randomRubbishTable.push(this.wordPartsPool[index]);
    }

    // remove the "correct answers" 
    // also add them into creationTableIndices
    let correctAnswersLookup = [];
    for (var index = 0; index < targetQuestion.wordParts.length; ++index) {
      let currWordPart = targetQuestion.wordParts[index];

      // to be a selectable guess item, it must exist in wordPartsLeftToGuess
      let canBeGuessed = targetQuestion.wordPartsLeftToGuess.includes(currWordPart);

      if (canBeGuessed) {
        correctAnswersLookup.push(currWordPart);
        creationTable.push(currWordPart);
      }

      // randomRubbishTable will never contain the correct answers
      Phaser.Utils.Array.Remove(randomRubbishTable, currWordPart);
    }

    // randomRubbishTable only contains wrong answers now
    let maxSelectableWordsInPanel = this.levelInfoTable[g_CurrLevelIndex].maxselectable;

    let rubbishElementsCount = maxSelectableWordsInPanel - creationTable.length;

    // populate the remaining rubbish elements
    for (var index = 0; index < rubbishElementsCount; ++index) {
      var randomIndex = Phaser.Utils.Array.RemoveRandomElement(randomRubbishTable);
      creationTable.push(randomIndex);
    }

    // populating the right selectables panel now
    let xGap = this.wordImageSize * 1.8;
    let startPosX = this.SelectablePanel.x - (0.5 * maxSelectableWordsInPanel * 95);
    let startPosY = this.SelectablePanel.y;

    // some correct answers the rest are rubbish
    for (var index = 0; index < maxSelectableWordsInPanel; ++index) {
      let targetWordPart = Phaser.Utils.Array.RemoveRandomElement(creationTable);
      let currWord = this.add.text(startPosX + xGap * index, startPosY, targetWordPart, { font: '64px ' + g_TargetChineseFonts, fill: "#000" });
      currWord.wordPartCharacter = targetWordPart;
      currWord.setOrigin(0.5);
      currWord.setScale(1.1, 1.1);
      currWord.setInteractive();

      this.input.setDraggable(currWord);

      // mark parts that are correct
      currWord.removedAsHint = false;
      currWord.correctPartAnswer = correctAnswersLookup.includes(targetWordPart);

      this.selectableWords.push(currWord);

      this.garbageCollector.push(currWord);
    }
  }

  ///////////////////////////////////////////////////////////////
  // based on current questions, prepare the drag boxes etc etc
  //////////////////////////////////////////////////////////////
  createQuestionAssets(targetQuestion, randomComboSetIndex, cenPosX, cenPosY) {
    let spawnPos = new Phaser.Math.Vector2(config.width * 0.14, config.height * 0.25);
    let wordSize = 1.1;
    let wordXGap = wordSize * 128 * 1.1;
    let maxWordsDisplay = 4; // assume is 4

    // choose a random combo
    //let randomComboSetIndex = Phaser.Math.Between(0, targetQuestion.wordsComboTable.length - 1);

    this.currQuestionAudioName = targetQuestion.audioTable[randomComboSetIndex];

    let resultSplitArray = targetQuestion.wordsComboTable[randomComboSetIndex].split('_');
    resultSplitArray.forEach(item => item.trim());

    let splitPinYinArray = targetQuestion.pinYinTable[randomComboSetIndex].split('_');
    splitPinYinArray.forEach(item => item.trim());

    // for centralize word based on word count
    let startPosOffSet = (maxWordsDisplay - resultSplitArray.length) * wordXGap * 0.5;

    let wordCreatedCache = [];

    // create all the words
    for (var index = 0; index < resultSplitArray.length; ++index) {
      let character = resultSplitArray[index];

      let currWord = this.add.text(spawnPos.x + (index * wordXGap) + startPosOffSet, spawnPos.y, character, { font: '100px ' + g_TargetChineseFonts, fill: "#000" });

      // create the han yun pin yin
      let pinYinData = splitPinYinArray[index];
      let pinYin = this.add.text(spawnPos.x + (index * wordXGap) + startPosOffSet + 30, spawnPos.y + 140, pinYinData, { font: '22px Arial', fill: "#000" });

      //let currWord = this.add.sprite(spawnPos.x + (index * wordXGap) + startPosOffSet, spawnPos.y, "QuestionWordsAtlas");
      //currWord.setFrame(atlasIndex);
      //currWord.setScale(wordSize, wordSize);

      wordCreatedCache.push(currWord);

      this.garbageCollector.push(pinYin);
      this.garbageCollector.push(currWord);
    }

    // assume only gues 1 word
    let targetGuessWordIndex = targetQuestion.guessWordsIndices[randomComboSetIndex];
    let targetGuessWord = wordCreatedCache[targetGuessWordIndex];

    let numberOfGuessWord = 1;

    for (var index = 0; index < numberOfGuessWord; ++index) {
      // the sprite word that we are creating boxes on

      // ugly random
      // inject random box count here
      let randomGuessTableIndices = []; // store generate box index
      for (var boxIndex = 0; boxIndex < targetQuestion.wordPartsBoxes.length; ++boxIndex) {
        randomGuessTableIndices.push(boxIndex);
      }
      // based on level difficulty, "remove randomly" things that need guessing
      let currLevelPartsToGuessCount = this.levelInfoTable[g_CurrLevelIndex].partsToGuess;
      for (var iter = 0; iter < currLevelPartsToGuessCount; ++iter) {
        Phaser.Utils.Array.RemoveRandomElement(randomGuessTableIndices);
      }

      // iterate the data given boxes now
      for (var boxIndex = 0; boxIndex < targetQuestion.wordPartsBoxes.length; ++boxIndex) {
        let wordBoxPosSizeInfo = targetQuestion.wordPartsBoxes[boxIndex];
        let wordPartInfo = targetQuestion.wordParts[boxIndex];

        //let splitArray = wordPartInfo.split('_');
        //let wordIndex = splitArray[0];
        //let atlasIndex = parseInt(splitArray[0]);
        //let guessOrFixed = splitArray[1];

        let guessPart = !randomGuessTableIndices.includes(boxIndex);

        // 64 is size of word
        // pos specified is normalized gap from center of word
        let boxX = wordBoxPosSizeInfo.x * this.wordImageSize + targetGuessWord.x;
        let boxY = wordBoxPosSizeInfo.y * this.wordImageSize + targetGuessWord.y;
        let boxSizeX = wordBoxPosSizeInfo.z;
        let boxSizeY = wordBoxPosSizeInfo.w;

        if (guessPart) {
          targetQuestion.wordPartsLeftToGuess.push(wordPartInfo);

          this.currQuestionGuessWord = targetGuessWord;
          targetGuessWord.visible = false;

          // drop zone
          let box = this.add.image(boxX, boxY, "WordDropBox").setScale(boxSizeX, boxSizeY);
          box.alpha = .7;

          let zone = this.add.zone(boxX, boxY, box.displayWidth, box.displayHeight).setRectangleDropZone(box.displayWidth, box.displayHeight);
          zone.requiredWordPart = wordPartInfo;
          zone.ownerDropBox = box;

          // var graphics = this.add.graphics();
          // graphics.lineStyle(2, 0xffff00);
          // graphics.strokeRect(zone.x - zone.input.hitArea.width / 2, zone.y - zone.input.hitArea.height / 2, zone.input.hitArea.width, zone.input.hitArea.height);

          this.garbageCollector.push(box);
        }
        // no need for box but create the word part sprite
        else {
          let fixedWordPart = this.add.text(boxX, boxY, wordPartInfo, { font: '100px ' + g_TargetChineseFonts, fill: "#000" });
          fixedWordPart.setOrigin(0.5);
          this.selectableGuessedCorrectWords.push(fixedWordPart);
          this.garbageCollector.push(fixedWordPart);
        }
      }
    }
  }

  ////////////////////////////
  // when hint btn is pressed
  ////////////////////////////
  processHint() {
    // take away some of the selections
    // account for words that are processed as hints
    let incorrectPool = [];
    Array.from(this.selectableWords).forEach(item => {
      if (!item.correctPartAnswer && !item.removedAsHint) {
        incorrectPool.push(item);
      }
    });

    // need at least 2
    if (incorrectPool.length >= 1) {
      //let removalCount = 0.2 * [g_CurrLevelIndex].maxselectable;
      let removalCount = 1;

      for (let index = 0; index < removalCount; ++index) {
        let removedItem = Phaser.Utils.Array.RemoveRandomElement(incorrectPool);

        removedItem.removedAsHint = true;

        // fade out
        this.add.tween({
          targets: removedItem,
          alpha: { from: 1, to: 0.0 },
          duration: 200
        });
      }
    }

    if (incorrectPool.length < 1) {
      this.HintBtn.disableInteractive();
      this.HintBtn.alpha = 0.5;
    }

    // deduct currency

  }

  /////////////////
  // clean up, get ready new question
  /////////////////
  resetQuestion() {
    Array.from(this.selectableWords).forEach(item => item.destroy());
    Array.from(this.selectableGuessedCorrectWords).forEach(item => item.destroy());
    Array.from(this.garbageCollector).forEach(item => item.destroy());

    this.selectableWords.length = 0;
    this.selectableGuessedCorrectWords.length = 0;
    this.garbageCollector.length = 0;

    // can click hint again
    this.HintBtn.setInteractive();
    this.HintBtn.alpha = 1.0;

    //this.currQuestion = Phaser.Utils.Array.GetRandom(this.allQuestions);

    //this.levelLogic();
    // extract the random question and Combo
    //console.log(g_allQuestionsIDPool);

    let randomID = Phaser.Utils.Array.RemoveRandomElement(g_allQuestionsIDPool);
    g_allQuestionsCooldownIDPool.push(randomID);

    //console.log("genrating => " + randomID);

    let splitID = randomID.split("_");
    let questionID = splitID[0];
    let comboID = splitID[1];

    this.currQuestion = this.allQuestions[questionID];

    // check if we need to recycle the pool
    if(g_allQuestionsIDPool.length == 0)
    {
      g_allQuestionsCooldownIDPool.forEach(item => g_allQuestionsIDPool.push(item));
      g_allQuestionsCooldownIDPool.length = 0; // clear it
    }

    this.createQuestionAssets(this.currQuestion, comboID, config.width * 0.4, config.height * 0.4);

    this.createDragWordSelectables(this.currQuestion);
  }

  //////////////////////////////////
  // create the underlay and splash
  /////////////////////////////////
  createSplashScreen(ownerScene) {
    ownerScene.maskUnderlay = ownerScene.add.image(config.width / 2, config.height / 2, "WhiteBox").setScale(config.width, config.height);
    ownerScene.maskUnderlay.tint = 0x000000;
    ownerScene.maskUnderlay.alpha = 0.5;
    ownerScene.maskUnderlay.visible = false;
    ownerScene.maskUnderlay.setInteractive();

    ownerScene.SummaryContainer = ownerScene.add.container(0, 0);
    ownerScene.gameOverSplash = ownerScene.add.image(config.width / 2, 0, "GameOverSplash");
    ownerScene.SplashTextA = ownerScene.add.text(ownerScene.gameOverSplash.x, ownerScene.gameOverSplash.y - 80, "Test asfs df", { font: '32px ' + g_TargetChineseFonts, fill: "#000", align: 'center' });
    ownerScene.SplashTextB = ownerScene.add.text(ownerScene.gameOverSplash.x, ownerScene.SplashTextA.y + 50, "Test asfs df", { font: '24px Arial', fill: "#000", align: 'center' });
    ownerScene.SplashTextA.setOrigin(0.5);
    ownerScene.SplashTextB.setOrigin(0.5);

    let additionalImageSpawn = ownerScene.add.image(ownerScene.gameOverSplash.x, ownerScene.gameOverSplash.y + 70, "GameSceneBG");
    ownerScene.SummaryContainer.additionalImageSpawn = additionalImageSpawn;
    additionalImageSpawn.visible = false;
    additionalImageSpawn.setOrigin(0.5);

    ownerScene.SummaryContainer.add([ownerScene.gameOverSplash, ownerScene.SplashTextA, ownerScene.SplashTextB, additionalImageSpawn]);
    ownerScene.SummaryContainer.visible = false;
  }

  /////////////////
  // Create Main
  /////////////////
  create() {

    this.allQuestions = [];
    this.garbageCollector = [];
    this.wordImageSize = 64;
    this.selectableWords = [];
    this.selectableGuessedCorrectWords = [];

    ////////////////////
    // Set up drag stuff
    ////////////////////
    this.input.on('dragstart', this.onDragStart, this);
    this.input.on('drag', this.onItemDragged);
    this.input.on('dragend', this.onItemDragRelease);
    this.input.on('drop', this.onItemDroppedInZone, this);
    this.input.on('dragenter', this.onItemDropZoneEnter, this);
    this.input.on('dragleave', this.onItemDropZoneLeave, this);

    // BG
    this.add.image(config.width / 2, config.height / 2, "GameSceneBG").setScale(config.width, config.height);

    // Game BG
    this.add.image(config.width / 2, config.height / 2, "GameMonsterBG").setScale(1, 1);

    // bg for the question words
    this.add.image(config.width * 0.51, config.height * 0.38, "MainGameSubBG").setScale(1, 1);

    // top UI
    this.starIcon = this.add.image(config.width / 2, config.height * 0.1, "StarIcon").setScale(0.5, 0.5);
    this.ScoreText = this.add.text(this.starIcon.x + 30, this.starIcon.y - 20, g_ExpBaseScore, { font: '42px Arial', fill: "#000" });
    this.LevelText = this.add.text(config.width * 0.1, this.starIcon.y, "Level " + parseInt(g_CurrLevelIndex + 1), { font: '24px Arial', fill: "#000" });
    this.LevelText.visible = false;
    this.ScoreText.visible = false;
    this.starIcon.visible = false;

    // create progression to bonus game bar
    let expBarBase = this.add.image(config.width / 2 - 150, config.height * 0.08, "ExpBar").setOrigin(0, 0.5);
    this.expBarContent = this.add.image(expBarBase.x + 53, expBarBase.y, "GenericBarContent").setOrigin(0, 0.5);

    // right panel for selectables
    this.SelectablePanel = this.add.image(config.width * 0.49, config.height * 0.72, "NoFillBox");
    this.SelectablePanel.alpha = 0.5;

    //this.ScoreText = this.add.text(0,0,  'chǎofàn', { font: '20px Arial', fill: "#000" });

    // accumulate star icon
    this.accumulateStarIcon = this.add.image(0, 0, "StarIcon").setScale(0.5, 0.5);
    this.accumulateStarIcon.visible = false;

    // hint btn
    this.HintBtn = this.add.image(config.width * 0.4, config.height * 0.9, "HintBtn").setInteractive();
    this.HintBtn.setScale(0.7, 0.7);
    this.HintBtn.on('pointerdown', this.buttonAnimEffect.bind(this, this.HintBtn,
      () => this.processHint(), "ButtonClick_SFX")
    );

    // audio button
    this.voiceOverBtn = this.add.image(config.width * 0.6, config.height * 0.9, "AudioButton").setScale(.8, .8).setInteractive();
    this.voiceOverBtn.on('pointerdown', this.buttonAnimEffect.bind(this, this.voiceOverBtn,
      () => {
        this.sound.play(this.currQuestionAudioName);
      }, "ButtonClick_SFX")
    );


    this.parseLevelData();

    this.resetQuestion();

    this.genericGameSceneInit(this);

    this.updateScore(0);

    ///////////////////////
    // TO BE PORTED ANIMATION CODE FOR MONSTER
    // create monster sprite
    // this.adultMonster = this.add.sprite(config.width * 0.2, config.height * 0.15, "AdultMonsterIdle");

    //   this.anims.create({
    //     key: "AdultMonsterIdleAnim",
    //     frames: this.anims.generateFrameNumbers('AdultMonsterIdle',
    //       { start: 0, end: 25 }),
    //     frameRate: 20,
    //     repeat: -1
    //   });

    //   this.anims.create({
    //     key: "AdultMonsterWalkAnim",
    //     frames: this.anims.generateFrameNumbers('AdultMonsterWalk',
    //       { start: 0, end: 15 }),
    //     frameRate: 20,
    //     repeat: -1
    //   });

    //   this.adultMonster.play("AdultMonsterWalkAnim");

    ///////////////////////

    // if (this.checkEntireGameOverCondition()) {

    //   // Create for when entire game is over
    //   this.maskUnderlay = this.add.image(config.width / 2, config.height / 2, "WhiteBox").setScale(config.width, config.height);
    //   this.maskUnderlay.tint = 0x000000;
    //   this.maskUnderlay.alpha = 0.0;
    //   this.maskUnderlay.visible = false;
    //   this.maskUnderlay.setInteractive();
    //   this.gameOverSplash = this.add.image(config.width / 2, -300, "GameOverSplash");
    //   this.multiplyIcon = this.add.image(config.width / 2, config.height / 2 + 50, "MultiplyIcon");
    //   this.summaryStarIcon = this.add.image(config.width / 2 - 50, config.height / 2 + 50, "StarIcon");
    //   this.numberSprite = this.add.sprite(config.width / 2 + 50, config.height / 2 + 50, "Numbers");
    //   this.multiplyIcon.visible = false;
    //   this.summaryStarIcon.visible = false;
    //   this.numberSprite.visible = false;

    //   this.starIconScaleTween = this.add.tween({
    //     targets: this.summaryStarIcon,
    //     scaleX: 1.12,
    //     scaleY: 1.12,
    //     duration: 200,
    //     yoyo: true,
    //     repeat: -1
    //   });

    //   this.anims.create({
    //     key: "SummaryCountScoreAnim",
    //     frames: this.anims.generateFrameNumbers('Numbers',
    //       { start: 0, end: g_Score }),
    //     frameRate: 10
    //   });

    //   this.numberSprite.on('animationcomplete', this.rollupSummaryComplete, this);

    this.createFireworks();

    //this.scene.start('CoinShowerBonusGame');

    if(g_CurrLevelIndex == 0){
    this.genericSplashSummary(this, "游戏开始", "Game Start", "", 3500);
    }
  }

  updateExpBar(oldScore, newScore, totalPossibleScore)
  {
    let normalizedScale = newScore / totalPossibleScore;

    if(normalizedScale < 0)
    {
      return;
    }

    if(oldScore == newScore)
    {
      this.expBarContent.setScale(0, 1);
      return;
    }

    let tintTargetImage = this.expBarContent;

    let valueDiff = newScore - oldScore;

    if (valueDiff < 0) {
      // red tint effect for penalize
      this.tweens.addCounter({
        from: 255,
        to: 2,
        duration: 100,
        yoyo: true,
        onUpdate: function (tween) {
          const value = Math.floor(tween.getValue());
          tintTargetImage.setTint(Phaser.Display.Color.GetColor(255, value, value));
        }
      });
    }

    this.add.tween({
          targets: this.expBarContent,
          scaleX: normalizedScale,
          duration: 800
        });
  }

  /////////////////
  // generic create fireworks
  /////////////////
  createFireworks() {
    this.anims.create({
      key: "FireworksEmit",
      frames: this.anims.generateFrameNumbers('Fireworks',
        { start: 0, end: 30 }),
      frameRate: 20,
      repeat: -1
    });

    this.fireworksContainer = this.add.container(0, 0);

    // create fireworks
    this.fireworksArray = [];
    for (var index = 0; index < 5; ++index) {
      let fireworksSprite = this.add.sprite(Phaser.Math.Between(0, config.width), Phaser.Math.Between(0, config.height), "Fireworks");
      fireworksSprite.setScale(2.5);
      fireworksSprite.visible = false;
      this.fireworksArray.push(fireworksSprite);

      this.fireworksContainer.add(fireworksSprite);
    }
  }

  /////////////////
  // check if question ended
  /////////////////
  checkEndQuestionCondition() {
    // no more to guess
    if (this.currQuestion.wordPartsLeftToGuess.length <= 0) {
      let newLevelAttained = this.updateScore(1);

      this.sound.play('QuestionCorrect_SFX');

      Array.from(this.selectableWords).forEach(item => item.destroy());

      // fade out selectables
      Array.from(this.selectableGuessedCorrectWords).forEach(item => {
        // fade out
        this.add.tween({
          targets: item,
          alpha: { from: 1, to: 0.0 },
          duration: 200
        });
      })

      // reveal correct word
      this.currQuestionGuessWord.visible = true;
      this.add.tween({
        targets: this.currQuestionGuessWord,
        alpha: { from: 0, to: 1.0 },
        duration: 200
      });

      // disable hint btn while waiting
      this.HintBtn.disableInteractive();
      this.HintBtn.alpha = 0.5;

      let genericDelay = 1000;

      this.time.delayedCall(genericDelay, () => {
        this.resetQuestion();

        if (newLevelAttained) {
          this.genericPlayCelebration(this);
          this.genericSplashSummary(this, "过关", "Level Complete", "", 3500, ()=>
          {
            this.scene.start('CoinShowerBonusGame');
          });
          
        }
        this.children.bringToTop(this.maskUnderlay);
        this.children.bringToTop(this.SummaryContainer);
        this.children.bringToTop(this.fireworksContainer);

      });
    }
  }

  /////////////////////////
  // Generic celebration
  ////////////////////////
  genericPlayCelebration(ownerScene)
  {
    ownerScene.sound.play("CombinedCelebration_SFX");

    // play fireworks
    for (var index = 0; index < ownerScene.fireworksArray.length; ++index) {

      let targetFireworkSprite = ownerScene.fireworksArray[index];
      targetFireworkSprite.visible = false;
      // random delay call
      ownerScene.time.delayedCall(index * 500, function () {
        targetFireworkSprite.visible = true;
        targetFireworkSprite.depth = 200;

        targetFireworkSprite.play("FireworksEmit");
      }, [], targetFireworkSprite);
      ownerScene.children.bringToTop(ownerScene.fireworksArray[index]);

    }
  }

  /////////////////////////
  // Generic splash summary
  ////////////////////////
  genericSplashSummary(ownerScene, messageA, messageB, additionalImage, displayDuration, postReadCallback) {

    ownerScene.SplashTextA.text = messageA;
    ownerScene.SplashTextB.text = messageB;

    // due to dragging we need to rearrage the summary box to show up on top
    ownerScene.maskUnderlay.visible = true;
    ownerScene.SummaryContainer.visible = true;

    // ownerScene.maskUnderlay.depth = 99;
    // ownerScene.SummaryContainer.depth = 99;

    ownerScene.SummaryContainer.y = -config.height * 0.5;

    if(additionalImage != "" || additionalImage){
      ownerScene.SummaryContainer.additionalImageSpawn.visible = true;
      ownerScene.SummaryContainer.additionalImageSpawn.setTexture(additionalImage);
    }
    else{
      ownerScene.SummaryContainer.additionalImageSpawn.visible = false;

    }

    // fade in the mask underlay
    ownerScene.add.tween({
      targets: ownerScene.maskUnderlay,
      alpha: 0.8,
      duration: 200
    });

    // drop down tween anim
    ownerScene.add.tween({
      targets: ownerScene.SummaryContainer,
      y: config.height / 2,
      ease: "Back.InOut",
      duration: 1000
    });

    // done reading
    ownerScene.time.delayedCall(displayDuration, () => {

      if (ownerScene.fireworksArray) {
        for (var index = 0; index < ownerScene.fireworksArray.length; ++index) {

          let targetFireworkSprite = ownerScene.fireworksArray[index];
          targetFireworkSprite.visible = false;
        }
      }
      // drop down tween anim
      ownerScene.add.tween({
        targets: ownerScene.SummaryContainer,
        y: -config.height / 2,
        ease: "Back.InOut",
        onCompleteScope: ownerScene,
        onComplete: function () {

          // fade out the mask underlay
          ownerScene.add.tween({
            targets: ownerScene.maskUnderlay,
            alpha: 0.0,
            duration: 200
          });

          if (postReadCallback) {
            postReadCallback();
          }
        },
        duration: 1000
      });
    });
  }

  ///////////////////////////////////////////////////////////
  // DRAG EVENT
  ///////////////////////////////////////////////////////////
  // Drag snap back
  onItemDragRelease(pointer, gameObject, dropped) {
    gameObject.setScale(1.0, 1.0);

    if (!dropped) {
      gameObject.x = gameObject.input.dragStartX;
      gameObject.y = gameObject.input.dragStartY;
    }
  }

  onDragStart(pointer, gameObject) {
    this.children.bringToTop(gameObject);
    gameObject.setScale(1.3, 1.3);
  }

  // follow drag
  onItemDragged(pointer, gameObject, dragX, dragY) {
    gameObject.x = pointer.x;
    gameObject.y = pointer.y;
  }

  // dropping item in zone
  onItemDroppedInZone(pointer, gameObject, dropZone) {

    // refresh hint btn
    this.HintBtn.setInteractive();
    this.HintBtn.alpha = 1.0;

    // check if this word part is correct
    let compareA_charInt = gameObject.wordPartCharacter.charCodeAt(0);
    let compareB_charInt = dropZone.requiredWordPart.charCodeAt(0);

    //let answerCorrect = gameObject.wordPartCharacter == dropZone.requiredWordPart;
    let answerCorrect = compareA_charInt == compareB_charInt;

    if (answerCorrect) {

      this.sound.play('Correct_SFX');

      gameObject.x = dropZone.x;
      gameObject.y = dropZone.y;
      gameObject.disableInteractive();

      dropZone.ownerDropBox.destroy();

      // 1 less part to guess
      Phaser.Utils.Array.Remove(this.currQuestion.wordPartsLeftToGuess, gameObject.wordPartCharacter);

      // remove from selectables
      Phaser.Utils.Array.Remove(this.selectableWords, gameObject);

      this.selectableGuessedCorrectWords.push(gameObject);

      // check end question condition
      this.checkEndQuestionCondition();
    }
    // wrong answer
    else {
      this.sound.play('Wrong_SFX');

      gameObject.x = gameObject.input.dragStartX;
      gameObject.y = gameObject.input.dragStartY;

      if(this.levelInfoTable[g_CurrLevelIndex].penalizeWrongAns > 0)
      {
        this.updateScore(-1);
      }
    }

    // Regenerate the selectables
    this.createDragWordSelectables(this.currQuestion);
  }

  // drop zone hover
  onItemDropZoneEnter(pointer, gameObject, dropZone) {
  }

  // drop zone leave
  onItemDropZoneLeave(pointer, gameObject, dropZone) {
  }

  //////////////////////////////////////////////////////////////////

  /////////////////
  // check if question ended
  /////////////////
  updateScore(valueDiff) {

    // award the global score as well
    if (valueDiff > 0) {
      g_Score += valueDiff;
      this.ScoreText.text = g_Score;
      this.sound.play("GenericCollect_SFX");
    }

    let finishedThisLevel = false;

    let currThreshold = this.levelInfoTable[g_CurrLevelIndex].threshold;

    // not really updated _gExpBaseScore
    this.updateExpBar(g_ExpBaseScore, g_ExpBaseScore + valueDiff, currThreshold);

    // real update now
    g_ExpBaseScore += valueDiff;
    g_ExpBaseScore = Phaser.Math.Clamp(g_ExpBaseScore, 0, currThreshold);

    if (g_ExpBaseScore >= currThreshold) {
      ++g_CurrLevelIndex;

      // clamp max level index
      let maxPossibleLevel = this.levelInfoTable.length - 1;
      g_CurrLevelIndex = Phaser.Math.Clamp(g_CurrLevelIndex, 0, maxPossibleLevel);

      g_ExpBaseScore = 0; // reset
      finishedThisLevel = true;
    }

    // not shown
    // this.LevelText.text = "Level " + parseInt(g_CurrLevelIndex + 1);
    // this.add.tween(
    //   {
    //     targets: this.starIcon,
    //     scaleX: 1.01,
    //     scaleY: 1.01,
    //     duration: 180,
    //     yoyo: true
    //   });

    // check if we move to new level
    return finishedThisLevel;
  }

  /***************************/
  // Generic Btn Click Effect
  /***************************/
  buttonAnimEffect(img, callback, btnAudioName) {
    this.tweens.add({
      targets: img,
      scaleX: img.scaleY * 1.2,
      scaleY: img.scaleX * 1.2,
      duration: 80,
      onComplete: callback,
      yoyo: true
    });

    this.sound.play(btnAudioName);
  }

  
  /***************************/
  // Generic pulse effect
  /***************************/
  genericPulseUIEffect(ownerScene, img, scaleAmt, callback)
  {
    ownerScene.tweens.add({
      targets: img,
      scaleX: img.scaleY * scaleAmt,
      scaleY: img.scaleX * scaleAmt,
      duration: 150,
      onComplete: callback,
      yoyo: true
    });

  }

  // /*******************************************/
  // // Create Home Btn, timer bar, game over splash etc
  // /*******************************************/
  // createSceneEssentials(ownerScene) {
  //   // populate stars
  //   ownerScene.starIcons = this.createGameProgressUI(ownerScene);

  //   // create timer bar
  //   var timerBarBase = ownerScene.add.image(config.width / 2 - 150, 120, "TimerBar").setOrigin(0, 0.5);
  //   ownerScene.timerBarContent = ownerScene.add.image(timerBarBase.x + 53, timerBarBase.y, "TimerBarContent").setOrigin(0, 0.5);
  //   ownerScene.gameTimer = ownerScene.time.delayedCall(g_LevelTime, ownerScene.onTimerExpired, [], ownerScene);

  //   // create mask white box
  //   ownerScene.maskUnderlay = ownerScene.add.image(config.width / 2, config.height / 2, "WhiteBox").setScale(config.width, config.height);
  //   ownerScene.maskUnderlay.tint = 0x000000;
  //   ownerScene.maskUnderlay.alpha = 0.0;
  //   ownerScene.maskUnderlay.visible = false;
  //   ownerScene.maskUnderlay.setInteractive();

  //   // GameoverSplash
  //   ownerScene.gameOverSplash = ownerScene.add.image(config.width / 2, -300, "GameOverSplash");

  //   // home btn over splash screen
  //   ownerScene.homeBtn = ownerScene.add.image(config.width / 2, config.height / 2 + 100, "HomeBtn");
  //   ownerScene.homeBtn.alpha = 0.0;
  //   ownerScene.homeBtn.once('pointerup', this.buttonAnimEffect.bind(ownerScene, ownerScene.homeBtn, () => ownerScene.scene.start('HomePage')));

  //   // mark this scene as visited
  //   ownerScene.visited = true;
  // }

  // /*******************************************/
  // // Generic behavior to deal with game over
  // /*******************************************/
  // gameOver(ownerScene) {

  //   ownerScene.sound.play("LevelComplete_SFX");
  //   // due to dragging we need to rearrage the summary box to show up on top
  //   ownerScene.maskUnderlay.visible = true;
  //   ownerScene.children.bringToTop(ownerScene.maskUnderlay);

  //   ownerScene.children.bringToTop(ownerScene.gameOverSplash);
  //   ownerScene.children.bringToTop(ownerScene.homeBtn);

  //   // fade in the mask underlay
  //   ownerScene.add.tween({
  //     targets: ownerScene.maskUnderlay,
  //     alpha: 0.8,
  //     duration: 200
  //   });

  //   // drop down tween anim
  //   ownerScene.add.tween({
  //     targets: ownerScene.gameOverSplash,
  //     y: config.height / 2,
  //     ease: "Quad.easeInOut",
  //     onComplete: function () {
  //       // stop timer 
  //       ownerScene.gameTimer.paused = true;

  //       ownerScene.homeBtn.alpha = 1;
  //       ownerScene.homeBtn.setInteractive();
  //     },
  //     duration: 1000
  //   });
  // }


  /*******************************************/
  // Common Init stuff for all scenes
  /*******************************************/
  genericGameSceneInit(ownerScene) {
    ownerScene.scoreIcon = ownerScene.add.image(config.width * 0.08, config.height * 0.08, "StarIcon").setScale(0.5, 0.5);
    ownerScene.ScoreText = ownerScene.add.text(ownerScene.scoreIcon.x + 20, ownerScene.scoreIcon.y - 20, g_Score, { font: '32px Arial', fill: "#000", align: 'center' });
    ownerScene.ScoreText.setOrigin(0.0);
    ownerScene.ScoreText.setStroke('#fff', 3);

    ownerScene.children.bringToTop(ownerScene.scoreDisplay);

    this.createSplashScreen(ownerScene);
  }

  /*******************************************/
  // Common update stuff for all scenes
  /*******************************************/
  genericGameSceneUpdate(ownerScene) {

    if (ownerScene.timerContainer) {
      ownerScene.timerBarContent.setScale(1 - ownerScene.gameTimer.getOverallProgress(), 1);

      ownerScene.children.bringToTop(ownerScene.timerContainer);
    }

    ownerScene.children.bringToTop(ownerScene.scoreIcon);
    ownerScene.children.bringToTop(ownerScene.ScoreText);

    ownerScene.children.bringToTop(ownerScene.maskUnderlay);
    ownerScene.children.bringToTop(ownerScene.SummaryContainer);
  }

  /*******************************************/
  // update the global score
  /*******************************************/
  genericUpdateGlobalScore(valueDiff, ownerScene) {
    g_Score += valueDiff;
    ownerScene.ScoreText.text = g_Score;

    if(valueDiff == 1){      
    ownerScene.sound.play("GenericCollect_SFX");
    }

    if(valueDiff > 10){      
      ownerScene.sound.play("CoinCollect_Big_SFX");
      }
  

    let targetObject = ownerScene.ScoreText;

    targetObject.setOrigin(0.0);
    targetObject.setScale(1, 1);
    
    ownerScene.tweens.add({
      targets: targetObject,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 80,
      onComplete: function (tween) {
        targetObject.setScale(1, 1);
      },
      yoyo: true
    });

    ownerScene.sound.play('ButtonClick_SFX');
  }

  /*******************************************/
  // generic timer
  /*******************************************/
  genericCreateTimer(levelDuration, ownerScene, startDelay) {

    // create timer bar
    ownerScene.timerContainer = ownerScene.add.container();

    var timerBarBase = ownerScene.add.image(config.width / 2 - 150, config.height * 0.1, "TimerBar").setOrigin(0, 0.5);

    ownerScene.timerBarContent = ownerScene.add.image(timerBarBase.x + 53, timerBarBase.y, "GenericBarContent").setOrigin(0, 0.5);

    ownerScene.timerContainer.add(timerBarBase);
    ownerScene.timerContainer.add(ownerScene.timerBarContent);

    ownerScene.children.bringToTop(ownerScene.timerContainer);

    ownerScene.gameTimer = ownerScene.time.delayedCall(levelDuration, ownerScene.onTimerExpired, [], ownerScene);
  }

  /*******************************************/
  // generic timer penalize timer
  /*******************************************/
  genericDeductTimer(valueDiff, ownerScene) {
    let tintTargetImage = ownerScene.timerBarContent;

    // red tint effect
    ownerScene.tweens.addCounter({
      from: 255,
      to: 2,
      duration: 100,
      yoyo: true,
      onUpdate: function (tween) {
        const value = Math.floor(tween.getValue());
        tintTargetImage.setTint(Phaser.Display.Color.GetColor(255, value, value));
      }
    });

    // speed up timer for a while
    ownerScene.tweens.addCounter({
      duration: 500,
      onUpdate: function (tween) {
        ownerScene.gameTimer.timeScale = 5.0;
      },
      onComplete: function (tween) {
        ownerScene.gameTimer.timeScale = 1.0;
      }
    });
  }
}

var config =
{
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: 0x000000,
  scene: [LoadingScene, GameScene, CoinShowerBonusGame]
}

var game = new Phaser.Game(config);
game.scene.start('LoadingScene');
