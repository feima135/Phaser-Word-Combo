////////////////
// LOADING 
////////////////

class LoadingScene extends Phaser.Scene {
  constructor() {
    super("LoadingScene");
  }

  preload() {
    this.graphics = this.add.graphics();
    this.newGraphics = this.add.graphics();
    var progressBar = new Phaser.Geom.Rectangle(200, 200, 400, 50);
    var progressBarFill = new Phaser.Geom.Rectangle(205, 205, 290, 40);

    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillRectShape(progressBar);

    this.newGraphics.fillStyle(0x3587e2, 1);
    this.newGraphics.fillRectShape(progressBarFill);

    var loadingTextVar = this.add.text(250, 260, "Loading: ", { fontSize: '32px', fill: '#FFF' });

    this.preloadAssets();

    this.load.on('progress', this.updateBar, { newGraphics: this.newGraphics, loadingText: loadingTextVar });
    this.load.on('complete', this.loadCompleted, this);
  }

  updateBar(percentage) {
    this.newGraphics.clear();
    this.newGraphics.fillStyle(0x3587e2, 1);
    this.newGraphics.fillRectShape(new Phaser.Geom.Rectangle(205, 205, percentage * 390, 40));

    percentage = percentage * 100;
    this.loadingText.setText("Loading: " + percentage.toFixed(2) + "%");
  }

  // when load completes
  loadCompleted() {

    this.scene.start('GameScene');
  }

  preloadAssets() {

    this.load.xml('LevelInfo', 'assets/LevelInfo.xml');
    this.load.xml('CoinShowerLevelInfo', 'assets/CoinShowerLevelInfo.xml');

    this.load.image('BG_A', 'assets/BG_A.png');
    this.load.image('BG_B', 'assets/BG_B.png');
    this.load.image('BG_C', 'assets/BG_C.png');

    this.load.image('WordDropBox', 'assets/WordDropBox.png');
    this.load.image('NoFillBox', 'assets/NoFillBox.png');
    this.load.image('HintBtn', 'assets/HintBtn.png');

    this.load.image('CrossIcon', 'assets/CrossIcon.png');

    //this.load.spritesheet('QuestionWordsAtlas', 'assets/QuestionWordsAtlas.png', { frameWidth: 128, frameHeight: 128 });
    //this.load.spritesheet('WordsAtlas', 'assets/WordsAtlas.png', { frameWidth: 64, frameHeight: 64 });

    this.load.spritesheet('AdultMonsterIdle', 'assets/AdultMonsterIdle.png', { frameWidth: 256, frameHeight: 210 });
    this.load.spritesheet('AdultMonsterWalk', 'assets/AdultMonsterWalk.png', { frameWidth: 256, frameHeight: 210 });

    this.load.image('GameOverSplash', 'assets/GameOverSplash.png');
    this.load.image('WhiteBox', 'assets/WhiteBox.png');

    // this.load.image('HomeBtn', 'assets/HomeBtn.png');
    this.load.image('StarIcon', 'assets/StarIcon.png');
    // this.load.image('StarIconBase', 'assets/StarIconEmptyBase.png');
    this.load.image('AudioButton', 'assets/AudioBtn.png');

    this.load.image('Coin', 'assets/Coin.png');
    this.load.image('Crown', 'assets/Crown.png');
    this.load.image('Gem', 'assets/Gem.png');
    this.load.image('Bomb', 'assets/Bomb.png');
    this.load.image('Skull_A', 'assets/Skull_A.png');
    this.load.image('GlobalScoreIcon', 'assets/GlobalScoreIcon.png');
    this.load.image('FreezeEffectOverlay', 'assets/FreezeEffectOverlay.png');
    this.load.image('WordCharacterBG', 'assets/WordCharacterBG.png');
    this.load.image('GuessWordComboBG', 'assets/GuessWordComboBG.png');
    this.load.image('ExplainBonusGame', 'assets/ExplainBonusGame.png');
    this.load.image('MainGameSubBG', 'assets/MainGameSubBG.png');

    this.load.spritesheet('Freeze', 'assets/Freeze.png', { frameWidth: 128, frameHeight: 131 });

    // this.load.image('MultiplyIcon', 'assets/MultiplyIcon.png');
    this.load.spritesheet('Fireworks', 'assets/Fireworks.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('Explosion', 'assets/Explosion.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('Sparkle', 'assets/Sparkle_Gold.png', { frameWidth: 32, frameHeight: 32 });

    // this.load.image('ChatBubble', 'assets/FoodStoreScene/ChatBubble.png');
    this.load.image('TimerBar', 'assets/TimerBar.png');
    this.load.image('GenericBarContent', 'assets/GenericBarContent.png');

    this.load.image('ExpBar', 'assets/ExpBar.png');

    // // audio
    this.load.audio('QuestionCorrect_SFX', 'assets/Audio/QuestionCorrect.mp3');
    this.load.audio('Correct_SFX', 'assets/Audio/Correct.mp3');
    
    this.load.audio('Wrong_SFX', 'assets/Audio/Wrong.mp3');
    // this.load.audio('CollectStar_SFX', 'assets/Audio/CollectStar.wav');

    this.load.audio('ButtonClick_SFX', 'assets/Audio/ButtonClick.mp3');

    // Voice over
    this.load.audio('DaAn_SFX', 'assets/Audio/Voiceover/DaAn_SFX.mp3');
    this.load.audio('DongDe_SFX', 'assets/Audio/Voiceover/DongDe_SFX.mp3');
    this.load.audio('DongShi_SFX', 'assets/Audio/Voiceover/DongShi_SFX.mp3');
    this.load.audio('HuiDa_SFX', 'assets/Audio/Voiceover/HuiDa_SFX.mp3');
    this.load.audio('LaoLei_SFX', 'assets/Audio/Voiceover/LaoLei_SFX.mp3');
    this.load.audio('ShiDe_SFX', 'assets/Audio/Voiceover/ShiDe_SFX.mp3');
    this.load.audio('TanLun_SFX', 'assets/Audio/Voiceover/TanLun_SFX.mp3');
    this.load.audio('TanTian_SFX', 'assets/Audio/Voiceover/TanTian_SFX.mp3');
    this.load.audio('YiKouTongSheng_SFX', 'assets/Audio/Voiceover/YiKouTongSheng_SFX.mp3');
    this.load.audio('LaoDong_SFX', 'assets/Audio/Voiceover/LaoDong_SFX.mp3');

    this.load.audio('CombinedCelebration_SFX', 'assets/Audio/CombinedCelebration.mp3');

    this.load.audio('CoinCollect_1_SFX', 'assets/Audio/CoinCollect_1.mp3');
    this.load.audio('CoinCollect_2_SFX', 'assets/Audio/CoinCollect_2.mp3');
    this.load.audio('CoinCollect_3_SFX', 'assets/Audio/CoinCollect_3.mp3');
    this.load.audio('CoinCollect_Big_SFX', 'assets/Audio/CoinCollect_Big_SFX.mp3');

    this.load.audio('FreezeCollect_SFX', 'assets/Audio/FreezeCollect.mp3');
    this.load.audio('BombCollect_SFX', 'assets/Audio/BombCollect.mp3');
    this.load.audio('GenericCollect_SFX', 'assets/Audio/GenericCollect.mp3');

    this.load.audio('WordCharacterCollect_SFX', 'assets/Audio/WordCharacterCollect.mp3');
  }
}
