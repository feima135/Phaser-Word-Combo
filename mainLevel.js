////////////////////
// Main Level Scene
////////////////////
class MainLevelScene extends Phaser.Scene {
  constructor() {
    super('MainLevelScene')
  }

  ///////////////////////////////////
  // setup recipe steps and game IDs
  //////////////////////////////////
  setupRecipe()
  {
    this.GameIDTable = {
      ChoppingBoard : "ChoppingBoard",
      MixingBowl    : "MixingBowl",
      FryingPan     : "FryingPan",
      Cucumber      : "Cucumber",
      Egg           : "Egg",
      CrackedEgg    : "CrackedEgg",
      Seaweed       : "Seaweed",
      Knife         : "Knife",
      Spatula       : "Spatula",
      EggWhisk      : "EggWhisk",
      Cut           : "Cut",
      Fry           : "Fry",
      Word_Cut_Cucumber : "Word_Cut_Cucumber",
      Word_CutSeaweed  : "CutSeaweeed",
      Word_CrackEgg    : "CrackEgg"
    }

    // cut cucumber step
    this.addRecipe(this.GameIDTable.ChoppingBoard, this.GameIDTable.Cucumber,
                  this.GameIDTable.Knife, this.GameIDTable.Cut, this.GameIDTable.Word_Cut_Cucumber);
    
    // crack egg step
    this.addRecipe(this.GameIDTable.MixingBowl, this.GameIDTable.Egg,
                  "", "", this.GameIDTable.Word_CrackEgg);
  }

  ///////////////////////////////////
  // Helper to add a recipe
  //////////////////////////////////
  addRecipe(prepBaseID, ingredientID, utensilID, interactionID, wordID)
  {
    let wordSpriteRef = this.add.image(this.chatBubble.x, this.chatBubble.y, wordID);
    wordSpriteRef.visible = false;

    let recipeStep = {prepBase    : prepBaseID, 
                      ingredient  : ingredientID, 
                      utenstil    : utensilID, 
                      interaction : interactionID,
                      wordSprite  : wordSpriteRef};

    this.recipeTable.push(recipeStep);
  }

  //////////////////////////////////////
  // Helper to add a prepbase board etc
  /////////////////////////////////////
  addPrepBase(prepBaseID)
  {
    let currPrepBase = this.add.image(this.prepBasePos.x, this.prepBasePos.y, prepBaseID).setInteractive();
    currPrepBase.visible = false;
    currPrepBase.GameID = prepBaseID;

    this.prepBaseTable.push(currPrepBase);
  }

  //////////////////////////////////////////////////////////
  // Create all the prep bases, bowl, chopping board etc etc
  //////////////////////////////////////////////////////////
  createPrepBaseTable()
  {
    this.prepBasePos = new Phaser.Math.Vector2();
    this.prepBasePos.x  = config.width * 0.3;
    this.prepBasePos.y = config.height * 0.75;

    this.addPrepBase(this.GameIDTable.ChoppingBoard);
    this.addPrepBase(this.GameIDTable.MixingBowl);
    this.addPrepBase(this.GameIDTable.FryingPan);
  }

  //////////////////////////////////////
  // Helper to add a selectable, food or utensil
  /////////////////////////////////////
  addSelectable(collectionTable, targetID, posX, posY, maxSpriteSheetFrames)
  {
    let spriteSheetIterStart = 0;
    let targetSprite = this.add.sprite(posX, posY, targetID).setInteractive();

    targetSprite.GameID = targetID;

    targetSprite.idlePulseAnim = 'idlePulse' + targetID;
    targetSprite.staticAnim = 'static' + targetID;
    targetSprite.initialSpriteFrame = spriteSheetIterStart;

    // idle pulse animation
    this.anims.create({
      key: targetSprite.idlePulseAnim,
      frames: this.anims.generateFrameNumbers(targetID,
        { start: spriteSheetIterStart, end: spriteSheetIterStart + 1 }),
      frameRate: 2,
      repeat: -1
    });

    // static
    this.anims.create({
      key: targetSprite.staticAnim,
      repeat: 1,
      frames: this.anims.generateFrameNumbers(targetID,
        { start: spriteSheetIterStart, end: spriteSheetIterStart }),
    });

    console.log(targetSprite);
    console.log(targetSprite.idlePulseAnim);

    targetSprite.play(targetSprite.idlePulseAnim);

    this.input.setDraggable(targetSprite);

    collectionTable.push(targetSprite);
  }


  //////////////////////////////////////////////////////////
  // create all the selectables
  //////////////////////////////////////////////////////////
  createSelectables(collectionTable, targetIDTable, startX, startY, xGap, maxSpriteSheetFrames)
  {
    for (var index = 0; index < targetIDTable.length; ++index) {

      let targetID = targetIDTable[index];

      this.addSelectable(collectionTable, targetID, startX + index * xGap, startY, maxSpriteSheetFrames);
    }
  }

  ///////////////////////////////////
  // Phaser create
  //////////////////////////////////
  create() {

    // game arrays
    this.recipeTable = [];
    this.prepBaseTable = [];
    this.ingredTable = [];
    this.utensilTable = [];

    // Do background first
    // Create food Store BG
    var BG = this.add.image(config.width / 2, config.height / 2, "FoodStoreBG");
    let scaleX = this.cameras.main.width / BG.width;
    let scaleY = this.cameras.main.height / BG.height;
    let scale = Math.max(scaleX, scaleY);
    BG.setScale(scale);

    // Do chat bubble next
    this.chatBubble = this.add.image(config.width * 0.8, config.height * 0.75, "ChatBubble").setScale(1, 1);

    this.setupRecipe();

    this.createPrepBaseTable();

    // Create Food ingredients
    let ingredsIDTable = [this.GameIDTable.Cucumber];
    this.createSelectables(this.ingredTable, ingredsIDTable, 250, 250, 50, 7);

    // Create utensils
    let utenstilsIDTable = [this.GameIDTable.Knife, this.GameIDTable.EggWhisk];

    this.createSelectables(this.utensilTable, utenstilsIDTable, 250, 300, 130, 7);

    this.foodItemVoiceOverSFXTable = ["Eat_Sausage_SFX", "Eat_Popcorn_SFX", "Eat_Drink_SFX", 
                                      "Eat_CandyFloss_SFX", "Eat_ChickenWing_SFX", "Eat_SkeweredMeat_SFX"];

    // /////////////////////////////
    // // Test load the current step
    // /////////////////////////////

    let targetRecipe = this.recipeTable[0];
    let targetPrepBase = targetRecipe.prepBase;
    let foundPrepBase = this.prepBaseTable.find(item => item.GameID == targetPrepBase);

    foundPrepBase.visible = true;
    targetRecipe.wordSprite.visible = true;

   
    // create the wrong answer x icon
    this.CrossX = this.add.image(this.prepBasePos.x, this.prepBasePos.y, "CrossX");
    this.CrossX.visible = false;

    // audio button
    this.audioBtn = this.add.image(this.chatBubble.x + 120, this.chatBubble.y + 60, "AudioButton").setScale(0.7, 0.7).setInteractive();

    // load customer request array
    //this.customerRequest = this.add.sprite(650, config.height - 180, "FoodItemsWord");

    // //  A drop zone for customer
    var zone = this.add.zone(this.prepBasePos.x, this.prepBasePos.y, 450, 300).setRectangleDropZone(300, 250);
    // // DEBUG
    // //  Just a visual display of the drop zone
    // var graphics = this.add.graphics();
    // graphics.lineStyle(2, 0xffff00);
    // graphics.strokeRect(zone.x - zone.input.hitArea.width / 2, zone.y - zone.input.hitArea.height / 2, zone.input.hitArea.width, zone.input.hitArea.height);

    ////////////////////
    // Set up drag stuff
    ////////////////////
    this.input.on('dragstart', this.onDragStart, this);
    this.input.on('drag', this.onItemDragged);
    this.input.on('dragend', this.onItemDragRelease);
    this.input.on('drop', this.onItemDroppedInZone, this);
    this.input.on('dragenter', this.onItemDropZoneEnter, this);
    this.input.on('dragleave', this.onItemDropZoneLeave, this);

    // // Create utensils
    // let startX = 120;
    // let startY = 120;
    // let utensilsGap = 50;
    // var knifeSprite = this.add.sprite(startX, startY, "Knife").setInteractive();
    // knifeSprite.idlePulseAnim = 'idlePulseKnife';

    // // idle pulse animation
    // this.anims.create({
    //   key: knifeSprite.idlePulseAnim,
    //   frames: this.anims.generateFrameNumbers("Knife",
    //     { start: 0, end: 1 }),
    //   frameRate: 2,
    //   repeat: -1
    // });

    // knifeSprite.play(knifeSprite.idlePulseAnim);
    // this.input.setDraggable(knifeSprite);

    // After creating the food items we register the audio voice over
    this.audioBtn.on('pointerdown', this.scene.get('HomePage').buttonAnimEffect.bind(this, this.audioBtn, () => this.sound.play(this.foodItemSprites[this.customerChoice].voiceOver)));

    // create a hidden star
    this.hiddenStar = this.add.image(0, 0, "StarIcon");
    this.hiddenStar.visible = false;

    // call this last after foodItemChoices is populated!
    this.setupNextRound(0);

    //create common scene essentials
    this.scene.get('HomePage').createSceneEssentials(this);
  }

  // game timer expired
  onTimerExpired() {
    this.scene.get("HomePage").gameOver(this);
  }

  setupNextRound(waitDelay) {
    setTimeout(() => {
      
      //this.resetAllFoodItemsInteractive();
      
      //this.FoodCustomer.setTexture('FoodCustomerIdle');

      // // done with everything
      // if (this.foodItemChoices.length == 0) {
      //   this.scene.get("HomePage").gameOver(this);
      // }
      // else {
      //   this.customerChoice = Phaser.Utils.Array.RemoveRandomElement(this.foodItemChoices);
      //   this.customerRequest.setFrame(this.customerChoice);

      //   // play the audio right away
      //   this.sound.play(this.foodItemSprites[this.customerChoice].voiceOver);
      // }

    }, waitDelay);
  }

  // // customer has eaten an item
  // animComplete(animation, sprite, animTex, foodItem) {

  //   if (animation.key && animation.key == animTex.eatenAnim) {

  //     foodItem.visible = false;
  //     this.setupNextRound();
  //   }
  // }

  // Disable interaction for other non dragged food items
  disableNonDraggedFoodItemsInteractive(excludedFoodItem) {

    for (var index = 0; index < this.foodItemSprites.length; ++index) {
      let currIterFoodItem = this.foodItemSprites[index];
      currIterFoodItem.play(currIterFoodItem.staticAnim);

      if (currIterFoodItem != excludedFoodItem) {
        currIterFoodItem.alpha = 0.5;
        currIterFoodItem.disableInteractive();
      }
    }
  }

  ////////////////////
  // reset all the interaction mode
  ////////////////////
  resetAllFoodItemsInteractive() {
    for (var index = 0; index < this.ingredTable.length; ++index) {

      let currIterFoodItem = this.ingredTable[index];
      currIterFoodItem.alpha = 1.0;
      currIterFoodItem.setInteractive();
      currIterFoodItem.play(currIterFoodItem.idlePulseAnim);
    }
  }

  // Drag snap back
  onItemDragRelease(pointer, gameObject, dropped) {

    gameObject.setScale(1.0, 1.0);

    if (!dropped) {
      //gameObject.sceneOwner.resetAllFoodItemsInteractive();

      gameObject.x = gameObject.input.dragStartX;
      gameObject.y = gameObject.input.dragStartY;
    }
  }

  onDragStart(pointer, gameObject) {
    this.children.bringToTop(gameObject);
    gameObject.setScale(1.3, 1.3);

    //this.disableNonDraggedFoodItemsInteractive(gameObject);
  }

  // follow drag
  onItemDragged(pointer, gameObject, dragX, dragY) {
    gameObject.x = pointer.x;
    gameObject.y = pointer.y;
  }

  // dropping item in zone
  onItemDroppedInZone(pointer, gameObject, dropZone) {

    // check if this is the item we want

    // EATEN!
    if (gameObject.foodItemID == this.customerChoice) {

      this.sound.play('Correct_SFX');

      // hard coded for drinks
      if (gameObject.foodItemID == 2) {
        this.sound.play('Drink_SFX');
      }
      else {
        this.sound.play('Eat_SFX');
      }

      gameObject.play(gameObject.eatenAnim);
      gameObject.disableInteractive();
      gameObject.eatenFlag = true;

      // fly star
      this.scene.get("HomePage").attainStar(this.prepBasePos.x, this.prepBasePos.y + 50, this.hiddenStar, this, true);

      // call this after duration
      this.setupNextRound(1300);
    }
    // wrong answer!
    else {
      this.sound.play('Wrong_SFX');

      gameObject.x = gameObject.input.dragStartX;
      gameObject.y = gameObject.input.dragStartY;

      this.CrossX.visible = true;
      // pulse
      this.add.tween({
        targets: this.CrossX,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 120,
        yoyo: true,
        completeDelay : 200,
        onCompleteScope: this,
        onComplete: function () {
          this.CrossX.visible = false;
        }
      });
      
      //this.FoodCustomer.setTexture('FoodCustomerIdle');
      
      this.resetAllFoodItemsInteractive();
    }
  }

  // drop zone hover
  onItemDropZoneEnter(pointer, gameObject, dropZone) {
    //this.FoodCustomer.setTexture('FoodCustomerOpen');
  }

  // drop zone leave
  onItemDropZoneLeave(pointer, gameObject, dropZone) {
    //this.FoodCustomer.setTexture('FoodCustomerIdle');
  }

  checkGameOverCondition() {
  }

  update() {
    this.scene.get("HomePage").genericGameSceneUpdate(this);
  }
}
