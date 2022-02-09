class CoinShowerBonusGame extends Phaser.Scene {

    constructor() {
      super('CoinShowerBonusGame')
    }

    create() {

        this.add.image(config.width / 2, config.height / 2, "GameMonsterBG").setScale(1, 1);

    }
}