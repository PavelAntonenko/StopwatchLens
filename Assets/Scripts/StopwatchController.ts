import { validate } from "SpectaclesInteractionKit/Utils/validate";
import { Interactable } from "SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";
import { ButtonFeedback } from "SpectaclesInteractionKit/Components/Helpers/ButtonFeedback";
import { HandInteractor } from "SpectaclesInteractionKit/Core/HandInteractor/HandInteractor";
import { SIK } from "SpectaclesInteractionKit/SIK";
import { InteractorInputType } from "SpectaclesInteractionKit/Core/Interactor/Interactor";

@component
export class NewScript extends BaseScriptComponent {
  private gestureModule: GestureModule = require("LensStudio:GestureModule");

  @input
  stopWatchText!: Text;

  @input
  savedTimeText1!: Text;

  @input
  savedTimeText2!: Text;

  @input
  mainScreen!: SceneObject;

  @input
  infoScreen!: SceneObject;

  @input
  startStopButton!: SceneObject;

  @input
  resetButton!: SceneObject;

  @input
  saveTimeButton!: SceneObject;

  @input
  infoButton!: SceneObject;

  @input
  backFromInfoButton!: SceneObject;

  private startStopButton_interactable: Interactable | null = null;
  private resetButton_interactable: Interactable | null = null;
  private saveTimeButton_interactable: Interactable | null = null;
  private infoButton_interactable: Interactable | null = null;
  private backFromInfoButton_interactable: Interactable | null = null;
  private startStopButton_buttonFeedback: ButtonFeedback | null = null;
  private isRunning: boolean = false;
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private saveCount: number = 0;
  private lastUpdateTime: number = 0;
  private isInfoScreen: boolean = false;
  private isMainScreenInitialized: boolean = false;
  private isInfoScreenInitialized: boolean = false;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.onStart();
    });

    this.createEvent("UpdateEvent").bind(() => {
      this.updateStopwatch();
    });

    const interactableTypeName = Interactable.getTypeName();
    const buttonFeedbackTypeName = ButtonFeedback.getTypeName();

    this.startStopButton_interactable =
      this.startStopButton.getComponent(interactableTypeName);
    if (isNull(this.startStopButton_interactable)) {
      throw new Error("Interactable component not found.");
    }

    this.startStopButton_buttonFeedback = this.startStopButton.getComponent(
      buttonFeedbackTypeName
    );
    if (isNull(this.startStopButton_buttonFeedback)) {
      throw new Error("ButtonFeedback component not found.");
    }

    this.resetButton_interactable =
      this.resetButton.getComponent(interactableTypeName);
    if (isNull(this.resetButton_interactable)) {
      throw new Error("Interactable component not found.");
    }

    this.saveTimeButton_interactable =
      this.saveTimeButton.getComponent(interactableTypeName);
    if (isNull(this.saveTimeButton_interactable)) {
      throw new Error("Interactable component not found.");
    }

    this.infoButton_interactable =
      this.infoButton.getComponent(interactableTypeName);
    if (isNull(this.infoButton_interactable)) {
      throw new Error("Interactable component not found.");
    }

    this.backFromInfoButton_interactable =
      this.backFromInfoButton.getComponent(interactableTypeName);
    if (isNull(this.backFromInfoButton_interactable)) {
      throw new Error("Interactable component not found.");
    }

    this.gestureModule
      .getPinchDownEvent(GestureModule.HandType.Right)
      .add((pinchDownArgs: PinchDownArgs) => {
        let interactionManager = SIK.InteractionManager;
        let rightHandInteractor = interactionManager.getInteractorsByType(
          InteractorInputType.RightHand
        )[0];

        if (
          !this.isInfoScreen &&
          !rightHandInteractor.targetHitInfo?.interactable
        ) {
          this.onSaveButton();
          print("Right Hand Pinch Down");
        }
      });

    this.gestureModule
      .getPinchDownEvent(GestureModule.HandType.Left)
      .add((pinchDownArgs: PinchDownArgs) => {
        let interactionManager = SIK.InteractionManager;
        let leftHandInteractor = interactionManager.getInteractorsByType(
          InteractorInputType.LeftHand
        )[0];

        if (
          !this.isInfoScreen &&
          !leftHandInteractor.targetHitInfo?.interactable
        ) {
          print("Left Hand Pinch Down");
          this.onStartStopButton();
        }
      });
  }

  onStart() {
    var store = global.persistentStorageSystem.store;
    const HAS_BEEN_RUN_KEY = "hasBeenRun";

    const hasBeenRun = store.getBool(HAS_BEEN_RUN_KEY);
    if (!hasBeenRun) {
      store.putBool(HAS_BEEN_RUN_KEY, true);
      this.showInfoScreen();
    } else {
      this.showMainScreen();
    }
  }

  private setupStartStopButtonCallbacks = (): void => {
    validate(this.startStopButton_interactable);
    this.startStopButton_interactable.onTriggerEnd.add(this.onStartStopButton);
  };

  private setupResetButtonCallbacks = (): void => {
    validate(this.resetButton_interactable);
    this.resetButton_interactable.onTriggerEnd.add(this.onReset);
  };

  private setupSaveButtonCallbacks = (): void => {
    validate(this.saveTimeButton_interactable);
    this.saveTimeButton_interactable.onTriggerEnd.add(this.onSaveButton);
  };

  private setupInfoButtonCallbacks = (): void => {
    validate(this.infoButton_interactable);
    this.infoButton_interactable.onTriggerEnd.add(this.showInfoScreen);
  };

  private setupBackFromInfoButtonCallbacks = (): void => {
    validate(this.backFromInfoButton_interactable);
    this.backFromInfoButton_interactable.onTriggerEnd.add(this.showMainScreen);
  };

  private onStartStopButton = (): void => {
    validate(this.startStopButton_interactable);
    validate(this.stopWatchText);

    if (this.isRunning) {
      this.stopStopwatch();
    } else {
      this.startStopwatch();
    }
  };

  private onSaveButton = (): void => {
    if (this.saveCount >= 14) return;

    validate(this.savedTimeText1);
    validate(this.savedTimeText2);

    const currentTime = this.getFormattedTime(this.elapsedTime);
    this.saveCount += 1;
    const formattedTime = `${this.saveCount}.${currentTime}\n`;

    if (this.saveCount % 2 === 1) {
      this.savedTimeText1.text += formattedTime;
    } else {
      this.savedTimeText2.text += formattedTime;
    }
  };

  private onReset = (): void => {
    validate(this.stopWatchText);
    validate(this.savedTimeText1);
    validate(this.savedTimeText2);

    this.savedTimeText1.text = "";
    this.savedTimeText2.text = "";
    this.saveCount = 0;
    this.elapsedTime = 0;
    this.startTime = Date.now();
    this.stopWatchText.text = "00:00:00";

    this.stopStopwatch();
    print("Stopwatch reset");
  };

  private startStopwatch = (): void => {
    validate(this.startStopButton_buttonFeedback);

    this.isRunning = true;
    this.startTime = Date.now() - this.elapsedTime;
    this.lastUpdateTime = Date.now();

    this.startStopButton_buttonFeedback.defaultIcon = requireAsset(
      "Icons/pause.png"
    ) as Texture;

    print("Stopwatch started");
  };

  private stopStopwatch = (): void => {
    this.isRunning = false;
    this.elapsedTime = Date.now() - this.startTime;
    this.stopWatchText.text = this.getFormattedTime(this.elapsedTime);
    this.startStopButton_buttonFeedback.defaultIcon = requireAsset(
      "Icons/play.png"
    ) as Texture;
    print("Stopwatch stopped");
  };

  private updateStopwatch = (): void => {
    if (this.isRunning && !this.isInfoScreen) {
      this.elapsedTime = Date.now() - this.startTime;

      const currentTime = Date.now();
      if (currentTime - this.lastUpdateTime >= 120) {
        this.stopWatchText.text = this.getFormattedTime(this.elapsedTime);
        this.lastUpdateTime = currentTime;
      }
    }
  };

  private showInfoScreen = (): void => {
    this.isInfoScreen = true;
    this.infoScreen.enabled = true;
    this.mainScreen.enabled = false;

    if (!this.isInfoScreenInitialized) {
      this.setupBackFromInfoButtonCallbacks();
      this.isInfoScreenInitialized = true;
    }

    print("Info screen shown");
  };

  private showMainScreen = (): void => {
    this.isInfoScreen = false;
    this.infoScreen.enabled = false;
    this.mainScreen.enabled = true;

    if (!this.isMainScreenInitialized) {
      this.setupStartStopButtonCallbacks();
      this.setupResetButtonCallbacks();
      this.setupSaveButtonCallbacks();
      this.setupInfoButtonCallbacks();
      this.isMainScreenInitialized = true;
    }

    print("Main screen shown");
  };

  private getFormattedTime = (elapsedTime: number): string => {
    const centiseconds = Math.floor((elapsedTime / 10) % 100);
    const seconds = Math.floor((elapsedTime / 1000) % 60);
    const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);

    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(seconds).padStart(2, "0");
    const formattedCentiseconds = String(centiseconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}:${formattedCentiseconds}`;
  };
}
