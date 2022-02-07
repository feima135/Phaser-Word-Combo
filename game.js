// global score
var g_Score = 0;
var g_LevelTime = 60000; // how long for each level in ms
var g_CurrLevelIndex = 0;
var g_LevelThreshold = [0, 5, 20, 30, 40, 50];

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
  parseLevelData()
  {
    const questionsTable = this.cache.xml.get('questionsData');
    const questions = questionsTable.getElementsByTagName('question');

    // iterate all possible questions
    Array.from(questions).forEach(questionData => 
      {
        let currQuestion = {
          wordsCombo : [], // atlas indices that form the words
          wordPartsBoxes : [], // pos and size
          wordParts : [], // first part is word index, next is atlas index 
          guessWordsIndices : [], // which word (index) is the target guess word
          wordPartsLeftToGuess : [] // atlas indicies of the remaining items left to guess
        };

      // consolidate the words combo
      let wordsCombos = questionData.getElementsByTagName('wordsCombo');
      for (var wordComboIndex = 0; wordComboIndex < wordsCombos.length; ++wordComboIndex) {
        let wordCombo = wordsCombos[wordComboIndex];
        let wordComboAtlasIndex = wordCombo.childNodes[0].nodeValue;
 
        let isThisAGuessWord = wordCombo.getAttribute("guessWord");
        if (isThisAGuessWord && isThisAGuessWord == "true") {
          currQuestion.guessWordsIndices.push(wordComboIndex);
        }
        currQuestion.wordsCombo.push(parseInt(wordComboAtlasIndex));
      }

        // consolidate the word part boxes combo
        let wordPartBoxes = questionData.getElementsByTagName('wordPartBox');
        Array.from(wordPartBoxes).forEach(wordPartBox =>
          {
            let x = wordPartBox.getAttribute("x");
            let y = wordPartBox.getAttribute("y");
            let u = wordPartBox.getAttribute("u");
            let w = wordPartBox.getAttribute("w");
            let atlasBoxInfo = wordPartBox.getAttribute("atlasInfo");

            let boxInfo = new Phaser.Math.Vector4(x, y, u, w);
            currQuestion.wordPartsBoxes.push(boxInfo);
            currQuestion.wordParts.push(atlasBoxInfo);
          });

          this.allQuestions.push(currQuestion);
      });

    // let currQuestion = {
    //   wordsCombo : [1, 2, 3, 4], // atlas indices that form the words
    //   wordPartsBoxes : [new Phaser.Math.Vector4(0, 0, 1, .5), new Phaser.Math.Vector4(1, 1, 1, 1)], // pos and size
    //   wordParts : ["1_5_Guess", "1_2_Fixed"], // first part is word index, next is atlas index 
    //   guessWordsIndices : [1] // which word (index) is the target guess word
    // };
  }

  ////////////////////////////////
  // Panel of words for selection
  ////////////////////////////////
  createDragWordSelectables(targetQuestion)
  {
    Array.from(this.selectableWords).forEach(item => item.destroy());

    this.selectableWords.length = 0;

    // temp hard coded max atlas words
    let maxAtlasWordIndex = 55;
    let creationTableIndices = [];

    // populate all rubbish first
    let randomRubbishTable = [];
    for(var index = 0; index < maxAtlasWordIndex; ++index)
    {
      randomRubbishTable.push(index);
    }

    // remove the "correct answers" 
    // also add them into creationTableIndices
    for (var index = 0; index < targetQuestion.wordParts.length; ++index) {
      let currWordPart = targetQuestion.wordParts[index];

      const splitArray = currWordPart.split("_");
      let atlasIndex = parseInt(splitArray[0]);
      let guessOrFixed = splitArray[1];

      // to make them selectable in the panel
      // ensure that those that has been guessed will not show up in selectables
      if (guessOrFixed == "Guess") {

        // to be a selectable guess item, it must exist in wordPartsLeftToGuess
        let canBeGuessed = targetQuestion.wordPartsLeftToGuess.includes(atlasIndex);

        if (canBeGuessed) {
          creationTableIndices.push(atlasIndex);
        }
      }

      // randomRubbishTable will never contain the correct answers
      Phaser.Utils.Array.Remove(randomRubbishTable, atlasIndex);
    }

    // randomRubbishTable only contains wrong answers now
    let rubbishElementsCount = this.maxSelectableWordsInPanel - creationTableIndices.length;

    // populate the remaining rubbish elements
    for(var index = 0; index < rubbishElementsCount; ++index)
    {
      var randomIndex = Phaser.Utils.Array.RemoveRandomElement(randomRubbishTable);
      creationTableIndices.push(randomIndex);
    }

    // populating the right selectables panel now
    let xGap = this.wordImageSize * 1.8;
    let startPosX = this.SelectablePanel.x - (0.5 * this.maxSelectableWordsInPanel * 95);
    let startPosY = this.SelectablePanel.y;

    // some correct answers the rest are rubbish
    for(var index = 0; index < this.maxSelectableWordsInPanel; ++index)
    {
      let targetAtlasIndex = Phaser.Utils.Array.RemoveRandomElement(creationTableIndices);

      let currWord = this.add.sprite(startPosX + xGap * index, startPosY, "WordsAtlas");
      currWord.setFrame(targetAtlasIndex);
      currWord.setInteractive();
      currWord.atlasIndex = targetAtlasIndex;

      this.input.setDraggable(currWord);

      this.selectableWords.push(currWord);

      this.garbageCollector.push(currWord);
    }
  }

  ///////////////////////////////////////////////////////////////
  // based on current questions, prepare the drag boxes etc etc
  //////////////////////////////////////////////////////////////
  createQuestionAssets(targetQuestion, cenPosX, cenPosY)
  {
    let spawnPos = new Phaser.Math.Vector2(config.width * 0.14, config.height * 0.4);
    let wordSize = 1.2;
    let wordXGap = wordSize * 128 * 1.3;
    let maxWordsDisplay = 4; // assume is 4

    // for centralize word based on word count
    let startPosOffSet = (maxWordsDisplay - targetQuestion.wordsCombo.length) * wordXGap * 0.5;

    let wordCreatedCache = [];

    // create all the words
    for(var index = 0; index < targetQuestion.wordsCombo.length; ++index)
    {
        let atlasIndex = targetQuestion.wordsCombo[index];
        let currWord = this.add.sprite(spawnPos.x + (index * wordXGap) + startPosOffSet, spawnPos.y, "QuestionWordsAtlas");
        currWord.setFrame(atlasIndex);
        currWord.setScale(wordSize, wordSize);

        wordCreatedCache.push(currWord);

        this.garbageCollector.push(currWord);
    }

    // for each of the word we are guessing
    for(var index = 0; index < targetQuestion.guessWordsIndices.length; ++index)
    {
      let targetGuessWordIndex = targetQuestion.guessWordsIndices[index];

      // the sprite word that we are creating boxes on
      let targetGuessWord = wordCreatedCache[targetGuessWordIndex];
      
      // iterate the data given boxes now
      for(var boxIndex = 0; boxIndex < targetQuestion.wordPartsBoxes.length; ++boxIndex)
      {    
        let wordBoxPosSizeInfo = targetQuestion.wordPartsBoxes[boxIndex];
        let wordPartInfo = targetQuestion.wordParts[boxIndex];

        let splitArray = wordPartInfo.split('_');
        //let wordIndex = splitArray[0];
        let atlasIndex = parseInt(splitArray[0]);
        let guessOrFixed = splitArray[1];

        // 64 is size of word
        // pos specified is normalized gap from center of word
        let boxX = wordBoxPosSizeInfo.x * this.wordImageSize + targetGuessWord.x;
        let boxY = wordBoxPosSizeInfo.y * this.wordImageSize + targetGuessWord.y;
        let boxSizeX = wordBoxPosSizeInfo.z;
        let boxSizeY = wordBoxPosSizeInfo.w;

        if (guessOrFixed == "Guess") {

          targetQuestion.wordPartsLeftToGuess.push(atlasIndex);

          this.currQuestionGuessWord = targetGuessWord;
          targetGuessWord.visible = false;

          // drop zone
          let box = this.add.image(boxX, boxY, "WordDropBox").setScale(boxSizeX, boxSizeY);
          box.alpha = .7;

          let zone = this.add.zone(boxX, boxY, box.displayWidth, box.displayHeight).setRectangleDropZone(box.displayWidth, box.displayHeight);
          zone.requiredAtlasIndex = atlasIndex;
          zone.ownerDropBox = box;

          // var graphics = this.add.graphics();
          // graphics.lineStyle(2, 0xffff00);
          // graphics.strokeRect(zone.x - zone.input.hitArea.width / 2, zone.y - zone.input.hitArea.height / 2, zone.input.hitArea.width, zone.input.hitArea.height);

          this.garbageCollector.push(box);
        }
        // no need for box but create the word part sprite
        else if (guessOrFixed == "Fixed") {
          let fixedWordPart = this.add.image(boxX, boxY, "WordsAtlas").setScale(1.5, 1.5);
          fixedWordPart.setFrame(atlasIndex);

          this.selectableGuessedCorrectWords.push(fixedWordPart);
          this.garbageCollector.push(fixedWordPart);
        }
      }
    }
  }

  ////////////////////////////
  // when hint btn is pressed
  ////////////////////////////
  processHint()
  {
  }
  
  /////////////////
  // clean up, get ready new question
  /////////////////
  resetQuestion()
  {
    Array.from(this.selectableWords).forEach(item => item.destroy());
    Array.from(this.selectableGuessedCorrectWords).forEach(item => item.destroy());
    Array.from(this.garbageCollector).forEach(item => item.destroy());

    this.selectableWords.length = 0;
    this.selectableGuessedCorrectWords.length = 0;
    this.garbageCollector.length = 0;
    
    this.currQuestion = Phaser.Utils.Array.GetRandom(this.allQuestions);

    this.levelLogic();

    this.createQuestionAssets(this.currQuestion, config.width * 0.4, config.height * 0.4);

    this.createDragWordSelectables(this.currQuestion);
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
    this.add.image(config.width / 2, config.height / 2, "GameSceneBG").setScale(100, 100);

    // top UI
    this.starIcon = this.add.image(config.width / 2, config.height * 0.1, "StarIcon").setScale(0.5, 0.5);
    this.ScoreText = this.add.text(this.starIcon.x + 30, this.starIcon.y - 20,  g_Score, { font: '42px Arial', fill: "#000" });
    this.LevelText = this.add.text(config.width * 0.1, this.starIcon.y,  "Level : " + g_CurrLevelIndex, { font: '24px Arial', fill: "#000" });

    // right panel for selectables
    this.SelectablePanel = this.add.image(config.width * 0.5, config.height * 0.68, "NoFillBox");
    this.SelectablePanel.alpha = 0.5;

    // hint btn
    this.HintBtn = this.add.image(config.width * 0.5, config.height * 0.9, "HintBtn").setInteractive();
    this.HintBtn.on('pointerdown', this.buttonAnimEffect.bind(this, this.HintBtn, 
      () => this.processHint())
      );

    this.parseLevelData();

    this.resetQuestion();

    //this.starIcons = this.createGameProgressUI(this);
    
    //this.updateGameProgressUI(this.starIcons);


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

    //   this.anims.create({
    //     key: "FireworksEmit",
    //     frames: this.anims.generateFrameNumbers('Fireworks',
    //       { start: 0, end: 30 }),
    //     frameRate: 20,
    //     repeat: -1
    //   });

    //   // create fireworks
    //   this.fireworksArray = [];
    //   for (var index = 0; index < 5; ++index) {
    //     let fireworksSprite = this.add.sprite(Phaser.Math.Between(0, config.width), Phaser.Math.Between(0, config.height), "Fireworks");
    //     fireworksSprite.setScale(2.5);
    //     this.fireworksArray.push(fireworksSprite);
    //   }

    //   this.entireGameOver();
    // }
  }

  rollupSummaryComplete()
  {
    this.starIconScaleTween.stop();
  }

  /////////////////
  // check if question ended
  /////////////////
  checkEndQuestionCondition()
  {
    if(this.currQuestion.wordPartsLeftToGuess.length <= 0)
    {
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

      // show correct splash

      this.time.delayedCall(1000, ()=> this.resetQuestion());
    }
  }

  checkEntireGameOverCondition()
  {
    return false;
  }

  entireGameOver() {
    this.sound.play("CombinedCelebration_SFX");   
    this.sound.play("LevelComplete_SFX");

    // due to dragging we need to rearrage the summary box to show up on top
    this.maskUnderlay.visible = true;
    this.children.bringToTop(this.maskUnderlay);
    this.children.bringToTop(this.gameOverSplash);
    this.children.bringToTop(this.multiplyIcon);
    this.children.bringToTop(this.summaryStarIcon);
    this.children.bringToTop(this.numberSprite);

    for (var index = 0; index < this.fireworksArray.length; ++index) {
      
      let targetFireworkSprite = this.fireworksArray[index];
      targetFireworkSprite.visible = false;
      // random delay call
      this.time.delayedCall(index * 1000, function() { targetFireworkSprite.visible = true;
        targetFireworkSprite.play("FireworksEmit");}, [], targetFireworkSprite);

      this.children.bringToTop(this.fireworksArray[index]);
    }

    // fade in the mask underlay
    this.add.tween({
      targets: this.maskUnderlay,
      alpha: 0.8,
      duration: 200
    });

    // drop down tween anim
    this.add.tween({
      targets: this.gameOverSplash,
      y: config.height / 2,
      ease: "Quad.easeInOut",
      onCompleteScope: this,
      onComplete: function() 
      { 
        this.multiplyIcon.visible = true;
        this.summaryStarIcon.visible = true;
        this.numberSprite.visible = true;
        this.numberSprite.play("SummaryCountScoreAnim");
      },
      duration: 1000
    });
  }

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

    // check if this word part is correct
    let answerCorrect = gameObject.atlasIndex == dropZone.requiredAtlasIndex;

    if (answerCorrect) {

      this.updateScore(1);

      gameObject.x = dropZone.x;
      gameObject.y = dropZone.y;

      dropZone.ownerDropBox.destroy();

      // 1 less part to guess
      Phaser.Utils.Array.Remove(this.currQuestion.wordPartsLeftToGuess, gameObject.atlasIndex);

      // remove from selectables
      Phaser.Utils.Array.Remove(this.selectableWords, gameObject);

      this.selectableGuessedCorrectWords.push(gameObject);

      // check end question condition
      this.checkEndQuestionCondition();
    }
    else
    {
      gameObject.x = gameObject.input.dragStartX;
      gameObject.y = gameObject.input.dragStartY;
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

  /////////////////
  // check if question ended
  /////////////////
  updateScore(valueDiff)
  {
    let prevLevel = g_CurrLevelIndex;

    g_Score += valueDiff;
    this.ScoreText.text = g_Score;

    // level score check
    for(var index = 0; index < g_LevelThreshold.length; ++index)
    {
      let currThreshold = g_LevelThreshold[index];
      if(g_Score >= currThreshold)
      {
        g_CurrLevelIndex = index;
      }
    }

    this.LevelText.text = g_CurrLevelIndex;

    // check if we move to new level
    let newLevelAttained = prevLevel != g_CurrLevelIndex;
    if(newLevelAttained)
    {
      this.levelLogic();
    }
    this.add.tween(
      {
      targets: this.starIcon,
      scaleX: 1.01,
      scaleY: 1.01,
      duration: 180,
      yoyo: true});
  }

  // hard coded simple level progression logic
  levelLogic()
  {
    if(g_CurrLevelIndex == 0)
    {
      this.maxSelectableWordsInPanel = 3;
      this.partsToGuess = 1;
    }
    else if(g_CurrLevelIndex == 1)
    {
      this.maxSelectableWordsInPanel = 5;
      this.partsToGuess = 2;
    }
  }
  

  /***************************/
  // Generic Btn Click Effect
  /***************************/
  buttonAnimEffect(img, callback) {
    this.tweens.add({
      targets: img,
      scaleX: img.scaleY * 1.2,
      scaleY: img.scaleX * 1.2,
      duration: 80,
      onComplete: callback,
      yoyo: true
    });

    this.sound.play('ButtonClick_SFX');
  }

  /*******************************************/
  // Create the stars used by multiple scenes
  /*******************************************/
  createGameProgressUI(target) {
    let starIcons = [];
    var maxStars = 12;
    var widthSpace = 60;
    var xStartOffset = 80;
    var yStartOffset = 60;

    for (var index = 0; index < maxStars; ++index) {
      var texName = 'StarIconBase';

      // create the highlighted stars
      if (index < g_Score) {
        texName = 'StarIcon';
      }

      let newStarIcon = target.add.image(xStartOffset + widthSpace * index, yStartOffset, texName);
      newStarIcon.setScale(0.8, 0.8);
      starIcons.push(newStarIcon);
    }

    return starIcons;
  }

  /*******************************************/
  // spawn hidden star and fly over to next slot and increase global score
  /*******************************************/
  attainStar(spawnX, spawnY, hiddenStar, ownerScene, startDelay) {

    hiddenStar.x = spawnX;
    hiddenStar.y = spawnY;
    hiddenStar.visible = true;

    let flyDelay = 920;
    if (!startDelay) {
      flyDelay = 0;
    }

    // pulse
    ownerScene.add.tween({
      targets: hiddenStar,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      delay: 600,
      yoyo: true
    });

    // fly up to star bar, specifically the next star
    ownerScene.add.tween({
      targets: hiddenStar,
      duration: 420,
      y: ownerScene.starIcons[g_Score].y,
      x: ownerScene.starIcons[g_Score].x,
      delay: flyDelay,
      onCompleteScope: ownerScene,
      onComplete: function () {
        ownerScene.sound.play("CollectStar_SFX");
        hiddenStar.visible = false;
        ownerScene.scene.get("HomePage").increaseGlobalScore(ownerScene);
        ownerScene.checkGameOverCondition();
      }
    });
  }

  /*******************************************/
  // Create Home Btn, timer bar, game over splash etc
  /*******************************************/
  createSceneEssentials(ownerScene) {
    // populate stars
    ownerScene.starIcons = this.createGameProgressUI(ownerScene);

    // create timer bar
    var timerBarBase = ownerScene.add.image(config.width / 2 - 150, 120, "TimerBar").setOrigin(0, 0.5);
    ownerScene.timerBarContent = ownerScene.add.image(timerBarBase.x + 53, timerBarBase.y, "TimerBarContent").setOrigin(0, 0.5);
    ownerScene.gameTimer = ownerScene.time.delayedCall(g_LevelTime, ownerScene.onTimerExpired, [], ownerScene);

    // create mask white box
    ownerScene.maskUnderlay = ownerScene.add.image(config.width / 2, config.height / 2, "WhiteBox").setScale(config.width, config.height);
    ownerScene.maskUnderlay.tint = 0x000000;
    ownerScene.maskUnderlay.alpha = 0.0;
    ownerScene.maskUnderlay.visible = false;
    ownerScene.maskUnderlay.setInteractive();

    // GameoverSplash
    ownerScene.gameOverSplash = ownerScene.add.image(config.width / 2, -300, "GameOverSplash");

    // home btn over splash screen
    ownerScene.homeBtn = ownerScene.add.image(config.width / 2, config.height / 2 + 100, "HomeBtn");
    ownerScene.homeBtn.alpha = 0.0;
    ownerScene.homeBtn.once('pointerup', this.buttonAnimEffect.bind(ownerScene, ownerScene.homeBtn, () => ownerScene.scene.start('HomePage')));

    // mark this scene as visited
    ownerScene.visited = true;
  }

  /*******************************************/
  // Generic behavior to deal with game over
  /*******************************************/
  gameOver(ownerScene) {

    ownerScene.sound.play("LevelComplete_SFX");
    // due to dragging we need to rearrage the summary box to show up on top
    ownerScene.maskUnderlay.visible = true;
    ownerScene.children.bringToTop(ownerScene.maskUnderlay);

    ownerScene.children.bringToTop(ownerScene.gameOverSplash);
    ownerScene.children.bringToTop(ownerScene.homeBtn);

    // fade in the mask underlay
    ownerScene.add.tween({
      targets: ownerScene.maskUnderlay,
      alpha: 0.8,
      duration: 200
    });

    // drop down tween anim
    ownerScene.add.tween({
      targets: ownerScene.gameOverSplash,
      y: config.height / 2,
      ease: "Quad.easeInOut",
      onComplete: function () {
        // stop timer 
        ownerScene.gameTimer.paused = true;

        ownerScene.homeBtn.alpha = 1;
        ownerScene.homeBtn.setInteractive();
      },
      duration: 1000
    });
  }

  /*******************************************/
  // Common update stuff for all scenes
  /*******************************************/
  genericGameSceneUpdate(ownerScene) {
    ownerScene.timerBarContent.setScale(1 - ownerScene.gameTimer.getOverallProgress(), 1);
  }
}

var config =
{
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: 0x000000,
  scene: [LoadingScene, GameScene]
}

var game = new Phaser.Game(config);
game.scene.start('LoadingScene');
