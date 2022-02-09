class CoinShowerBonusGame extends Phaser.Scene {

  constructor() {
    super('CoinShowerBonusGame')
  }

  create() {

    this.dispatchInterval = 1500;

    this.add.image(config.width / 2, config.height / 2, "GameMonsterBG").setScale(1, 1);

    this.parseData();

    this.activateCoinShower();
  }

  // populate spawn data from XML
  parseData()
  {
    this.spawnTableInfo = [];

    const spawnInfoData = this.cache.xml.get('CoinShowerLevelInfo');

    const spawnInfoTable = spawnInfoData.getElementsByTagName('SpawnInfoTable');

    let currRNGValue = 0.0; // for counting min max, a running count
    Array.from(spawnInfoTable).forEach(info => {

      let rngThreshold = info.getAttribute("RNGSpawn");

      let spawnInfo = {
        RNGThresholdMin : currRNGValue,
        RNGThresholdMax : currRNGValue + rngThreshold,
        ID : info.getAttribute("ID"),
        Payout : info.getAttribute("Payout")
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
    let randomFallDuration = Phaser.Math.FloatBetween(1500, 5000);
    let randomStartDelay = Phaser.Math.FloatBetween(0, 3500);
    let startY = -bufferItemWorldSize;
    let finalY = config.height + bufferItemWorldSize;

    // random select type to drop

    let selectableItem = this.add.image(spawnPosX, -bufferItemWorldSize, "").setScale(0.5);
    selectableItem.setInteractive();
    selectableItem.on('pointerdown', this.scene.get('GameScene').buttonAnimEffect.bind(this, selectableItem, 
      () => {
        console.log(this);
        this.onSelectableItemClicked(selectableItem);}));

    // set the random type
    let spawnRNG = Phaser.Math.FloatBetween(0, 1);
    for(var rngIndex = 0; rngIndex < this.spawnTableInfo.length; ++rngIndex)
    {
      let currSpawnItem = this.spawnTableInfo[rngIndex];
      console.log(currSpawnItem);

      if(spawnRNG >= currSpawnItem.RNGThresholdMin && spawnRNG < currSpawnItem.RNGThresholdMax)
      {
        console.log(currSpawnItem);
        selectableItem.setTexture(currSpawnItem.ID);
        selectableItem.payout = currSpawnItem.Payout;
      }
    }

    // drop down tween anim
    this.add.tween({
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

  }

  activateCoinShower() {

    // dispatch routine
    this.add.tween({
      targets: this,
      onLoopScope: this,
      loop: -1,
      loopDelay: this.dispatchInterval,
      onLoop: function()
      {
        this.dispatchItem();
      },
    });
  }

  onSelectableItemClicked(selectedItem)
  {
    console.log(selectedItem.payout);
  }
}