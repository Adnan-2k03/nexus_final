import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdOptions, AdLoadInfo, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const initializeAdMob = async () => {
  if (!isNative) {
    console.log('AdMob is only available on native platforms');
    return;
  }

  try {
    await AdMob.initialize({
      testingDevices: ['YOUR_TEST_DEVICE_ID'],
      initializeForTesting: true,
    });
    console.log('AdMob initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
  }
};

export const showBannerAd = async () => {
  if (!isNative) return;

  const options: BannerAdOptions = {
    adId: 'ca-app-pub-3940256099942544/6300978111',
    adSize: BannerAdSize.BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: true,
  };

  try {
    await AdMob.showBanner(options);
  } catch (error) {
    console.error('Failed to show banner ad:', error);
  }
};

export const hideBannerAd = async () => {
  if (!isNative) return;
  
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.error('Failed to hide banner ad:', error);
  }
};

export const showRewardedAd = async (): Promise<boolean> => {
  if (!isNative) {
    console.log('Rewarded ads are only available on native platforms');
    return false;
  }

  const options: RewardAdOptions = {
    adId: 'ca-app-pub-3940256099942544/5224354917',
    isTesting: true,
  };

  return new Promise(async (resolve, reject) => {
    let rewarded = false;

    try {
      const rewardedListener = await AdMob.addListener(RewardAdPluginEvents.Loaded, (info: AdLoadInfo) => {
        console.log('Rewarded ad loaded', info);
      });

      const dismissedListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        console.log('Rewarded ad dismissed');
        rewardedListener.remove();
        dismissedListener.remove();
        rewardListener.remove();
        resolve(rewarded);
      });

      const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
        console.log('User earned reward:', reward);
        rewarded = true;
      });

      await AdMob.prepareRewardVideoAd(options);
      await AdMob.showRewardVideoAd();
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      reject(error);
    }
  });
};

export const isAdMobAvailable = (): boolean => {
  return isNative;
};
