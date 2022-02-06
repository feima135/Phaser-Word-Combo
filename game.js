// global score
var g_Score = 0;
var g_LevelTime = 60000; // how long for each level in ms

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
          guessRemainCount : 0 // how many more parts needs guessing
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
            let guessOrFixed = atlasBoxInfo.split('_')[1];

            if(guessOrFixed == "Guess")
            {
              ++currQuestion.guessRemainCount;
            }

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
    let maxSelectableWordsInPanel = 6;

    // temp hard coded max atlas words
    let maxAtlasWordIndex = 55;
    let creationTableIndices = [];

    // populate all rubbish first
    let randomRubbishTable = [];
    for(var index = 0; index < maxAtlasWordIndex; ++index)
    {
      randomRubbishTable.push(index);
    }

    // remove the "correct", also add them into creationTableIndices
    for(var index = 0; index < targetQuestion.wordParts.length; ++index)
    {
      let currWordPart = targetQuestion.wordParts[index];

      const splitArray = currWordPart.split("_");
      let atlasIndex = splitArray[0];
      let guessOrFixed = splitArray[1];

      if(guessOrFixed == "Guess")
      {
        creationTableIndices.push(atlasIndex);
      }

      Phaser.Utils.Array.Remove(randomRubbishTable, atlasIndex);
    }

    // randomRubbishTable only contains wrong answers now
    let rubbishElementsCount = maxSelectableWordsInPanel - creationTableIndices.length;

    // populate the remaining rubbish elements
    for(var index = 0; index < rubbishElementsCount; ++index)
    {
      var randomIndex = Phaser.Utils.Array.RemoveRandomElement(randomRubbishTable);
      creationTableIndices.push(randomIndex);
    }

    // populating the right selectables panel now
    let xGap = this.wordImageSize * 1.8;
    let startPosX = this.SelectablePanel.x - (0.5 * maxSelectableWordsInPanel * 95);
    let startPosY = this.SelectablePanel.y;

    // some correct answers the rest are rubbish
    for(var index = 0; index < maxSelectableWordsInPanel; ++index)
    {
      let targetAtlasIndex = Phaser.Utils.Array.RemoveRandomElement(creationTableIndices);

      let currWord = this.add.sprite(startPosX + xGap * index, startPosY, "WordsAtlas");
      currWord.setFrame(targetAtlasIndex);
      currWord.setInteractive();
      currWord.atlasIndex = targetAtlasIndex;

      this.input.setDraggable(currWord);

      this.garbageCollector.push(currWord);
    }
  }

  ///////////////////////////////////////////////////////////////
  // based on current questions, prepare the drag boxes etc etc
  //////////////////////////////////////////////////////////////
  createQuestionAssets(targetQuestion, cenPosX, cenPosY)
  {
    let spawnPos = new Phaser.Math.Vector2(config.width * 0.14, config.height * 0.4);
    let wordSize = 2.7;
    let wordXGap = wordSize * this.wordImageSize * 1.1;
    let maxWordsDisplay = 4; // assume is 4

    // for centralize word based on word count
    let startPosOffSet = (maxWordsDisplay - targetQuestion.wordsCombo.length) * wordXGap * 0.5;

    let wordCreatedCache = [];

    // create all the words
    for(var index = 0; index < targetQuestion.wordsCombo.length; ++index)
    {
        let atlasIndex = targetQuestion.wordsCombo[index];
        let currWord = this.add.sprite(spawnPos.x + (index * wordXGap) + startPosOffSet, spawnPos.y, "WordsAtlas");
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
        let atlasIndex = splitArray[0];
        let guessOrFixed = splitArray[1];

        if (guessOrFixed == "Guess") {
          // 64 is size of word
          // pos specified is normalized gap from center of word
          let boxX = wordBoxPosSizeInfo.x * this.wordImageSize + targetGuessWord.x;
          let boxY = wordBoxPosSizeInfo.y * this.wordImageSize + targetGuessWord.y;
          let boxSizeX = wordBoxPosSizeInfo.z;
          let boxSizeY = wordBoxPosSizeInfo.w;

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
    Array.from(this.garbageCollector).forEach(item => item.destroy());

    this.currQuestion = Phaser.Utils.Array.GetRandom(this.allQuestions);

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
    if(this.currQuestion.guessRemainCount <= 0)
    {
      this.resetQuestion();
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
      gameObject.x = dropZone.x;
      gameObject.y = dropZone.y;

      dropZone.ownerDropBox.destroy();

      --this.currQuestion.guessRemainCount;
      
      // check end question condition
      this.checkEndQuestionCondition();
    }
    else
    {
      gameObject.x = gameObject.input.dragStartX;
      gameObject.y = gameObject.input.dragStartY;
    }
  }

  // drop zone hover
  onItemDropZoneEnter(pointer, gameObject, dropZone) {
  }

  // drop zone leave
  onItemDropZoneLeave(pointer, gameObject, dropZone) {


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

  /************************************/
  // used by scenes to update new score
  /************************************/
  increaseGlobalScore(ownerScene) {
    ++g_Score;
    this.updateGameProgressUI(ownerScene.starIcons, ownerScene);
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
  // update star progress generic
  /*******************************************/
  updateGameProgressUI(starIcons, ownerScene) {

    // set the star icons according to score
    for (var index = 0; index < starIcons.length; ++index) {
      if (index == g_Score - 1) {
        let targetStarIcon = starIcons[index];
        targetStarIcon.setTexture('StarIcon');

        // optional for children scenes to show scale pulse
        if (ownerScene) {
          // Scale Pulse Effect
          ownerScene.add.tween({
            targets: targetStarIcon,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 100,
            yoyo: true
          });
        }
      }
    }
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
