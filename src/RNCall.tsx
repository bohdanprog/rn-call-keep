import React, {useState, useEffect, useCallback} from 'react';
import {Platform, StyleSheet, Text, View, TouchableOpacity, ScrollView} from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import BackgroundTimer from 'react-native-background-timer';
import DeviceInfo from 'react-native-device-info';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';

BackgroundTimer.start();

const hitSlop = {top: 10, left: 10, right: 10, bottom: 10};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 20,
    marginBottom: 20,
  },
  callButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    width: '100%',
  },
  logContainer: {
    flex: 3,
    width: '100%',
    backgroundColor: '#D9D9D9',
  },
  log: {
    fontSize: 10,
  },
});

type HeldCallsState = {[key: string]: boolean};
type MutedCallsState = {[key: string]: boolean};
type CallsState = {[key: string]: string};

RNCallKeep.setup({
  ios: {
    appName: 'callkeep',
  },
  android: {
    alertTitle: 'Permissions required',
    alertDescription: 'This application needs to access your phone accounts',
    cancelButton: 'Cancel',
    okButton: 'ok',
    selfManaged: true,
    additionalPermissions: [],
  },
});

const getNewUuid = () => uuidv4().toLowerCase();

const format = (_uuid: string) => _uuid.split('-')[0];

const getRandomNumber = () => String(Math.floor(Math.random() * 100000));

const isIOS = Platform.OS === 'ios';

export function RNCall() {
  const [logText, setLog] = useState('');

  const [heldCalls, setHeldCalls] = useState<HeldCallsState>({}); // callKeep uuid: held
  const [mutedCalls, setMutedCalls] = useState<MutedCallsState>({}); // callKeep uuid: muted
  const [calls, setCalls] = useState<CallsState>({}); // callKeep uuid: number

  const log = useCallback(
    (text: string) => {
      console.info(text);
      setLog(logText + '\n' + text);
    },
    [logText],
  );

  const addCall = useCallback(
    (callUUID: string, number: string) => {
      setHeldCalls({...heldCalls, [callUUID]: false});
      setCalls({...calls, [callUUID]: number});
    },
    [calls, heldCalls],
  );

  const removeCall = useCallback(
    (callUUID: string) => {
      const {[callUUID]: _, ...updated} = calls;
      const {[callUUID]: __, ...updatedHeldCalls} = heldCalls;

      setCalls(updated);
      setHeldCalls(updatedHeldCalls);
    },
    [calls, heldCalls],
  );

  const setCallHeld = useCallback(
    (callUUID: string, held: boolean): void => {
      setHeldCalls({...heldCalls, [callUUID]: held});
    },
    [heldCalls],
  );

  const setCallMuted = useCallback(
    (callUUID: string, muted: boolean): void => {
      setMutedCalls({...mutedCalls, [callUUID]: muted});
    },
    [mutedCalls],
  );

  const displayIncomingCall = (number: string) => {
    const callUUID = getNewUuid();
    addCall(callUUID, number);

    log(`[displayIncomingCall] ${format(callUUID)}, number: ${number}`);

    RNCallKeep.displayIncomingCall(callUUID, number, number, 'number', false);
  };

  const displayIncomingCallNow = () => {
    displayIncomingCall(getRandomNumber());
  };

  const displayIncomingCallDelayed = () => {
    BackgroundTimer.setTimeout(() => {
      displayIncomingCall(getRandomNumber());
    }, 3000);
  };

  const answerCall = useCallback(
    ({callUUID}: {callUUID: string}): void => {
      const number = calls[callUUID];
      log(`[answerCall] ${format(callUUID)}, number: ${number}`);

      RNCallKeep.startCall(callUUID, number, number);

      BackgroundTimer.setTimeout(() => {
        log(`[setCurrentCallActive] ${format(callUUID)}, number: ${number}`);
        RNCallKeep.setCurrentCallActive(callUUID);
      }, 1000);
    },
    [calls, log],
  );

  const didPerformDTMFAction = useCallback(
    ({callUUID, digits}: {callUUID: string; digits: string}): void => {
      const number = calls[callUUID];
      log(`[didPerformDTMFAction] ${format(callUUID)}, number: ${number} (${digits})`);
    },
    [calls, log],
  );

  const didReceiveStartCallAction = useCallback(
    ({handle}) => {
      if (!handle) {
        // @TODO: sometime we receive `didReceiveStartCallAction` with handle` undefined`
        return;
      }
      const callUUID = getNewUuid();
      addCall(callUUID, handle);

      log(`[didReceiveStartCallAction] ${callUUID}, number: ${handle}`);

      RNCallKeep.startCall(callUUID, handle, handle);

      BackgroundTimer.setTimeout(() => {
        log(`[setCurrentCallActive] ${format(callUUID)}, number: ${handle}`);
        RNCallKeep.setCurrentCallActive(callUUID);
      }, 1000);
    },
    [addCall, log],
  );

  const didPerformSetMutedCallAction = useCallback(
    ({muted, callUUID}: {muted: boolean; callUUID: string}) => {
      const number = calls[callUUID];
      log(`[didPerformSetMutedCallAction] ${format(callUUID)}, number: ${number} (${muted})`);

      setCallMuted(callUUID, muted);
    },
    [calls, log, setCallMuted],
  );

  const didToggleHoldCallAction = useCallback(
    ({hold, callUUID}: {hold: boolean; callUUID: string}) => {
      const number = calls[callUUID];
      log(`[didToggleHoldCallAction] ${format(callUUID)}, number: ${number} (${hold})`);

      setCallHeld(callUUID, hold);
    },
    [calls, log, setCallHeld],
  );

  const endCall = useCallback(
    ({callUUID}: {callUUID: string}) => {
      const handle = calls[callUUID];
      log(`[endCall] ${format(callUUID)}, number: ${handle}`);

      removeCall(callUUID);
    },
    [calls, log, removeCall],
  );

  const hangup = (callUUID: string) => {
    RNCallKeep.endCall(callUUID);
    removeCall(callUUID);
  };

  const setOnHold = (callUUID: string, held: boolean) => {
    const handle = calls[callUUID];
    RNCallKeep.setOnHold(callUUID, held);
    log(`[setOnHold: ${held}] ${format(callUUID)}, number: ${handle}`);

    setCallHeld(callUUID, held);
  };

  const setOnMute = (callUUID: string, muted: boolean) => {
    const handle = calls[callUUID];
    RNCallKeep.setMutedCall(callUUID, muted);
    log(`[setMutedCall: ${muted}] ${format(callUUID)}, number: ${handle}`);

    setCallMuted(callUUID, muted);
  };

  const updateDisplay = (callUUID: string) => {
    const number = calls[callUUID];
    // Workaround because Android doesn't display well displayName, se we have to switch ...
    if (isIOS) {
      RNCallKeep.updateDisplay(callUUID, 'New Name', number);
    } else {
      RNCallKeep.updateDisplay(callUUID, number, 'New Name');
    }

    log(`[updateDisplay: ${number}] ${format(callUUID)}`);
  };

  useEffect(() => {
    RNCallKeep.addEventListener('answerCall', answerCall);
    RNCallKeep.addEventListener('didPerformDTMFAction', didPerformDTMFAction);
    RNCallKeep.addEventListener('didReceiveStartCallAction', didReceiveStartCallAction);
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', didPerformSetMutedCallAction);
    RNCallKeep.addEventListener('didToggleHoldCallAction', didToggleHoldCallAction);
    RNCallKeep.addEventListener('endCall', endCall);

    return () => {
      RNCallKeep.removeEventListener('answerCall');
      RNCallKeep.removeEventListener('didPerformDTMFAction');
      RNCallKeep.removeEventListener('didReceiveStartCallAction');
      RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
      RNCallKeep.removeEventListener('didToggleHoldCallAction');
      RNCallKeep.removeEventListener('endCall');
    };
  }, [
    answerCall,
    didPerformDTMFAction,
    didPerformSetMutedCallAction,
    didReceiveStartCallAction,
    didToggleHoldCallAction,
    endCall,
  ]);

  const [isEmulator, setIsEmulator] = useState<undefined | boolean>(undefined);

  const checkedIsEmulator = useCallback(async () => {
    const emulator = await DeviceInfo.isEmulator();
    setIsEmulator(emulator);
  }, []);

  useEffect(() => {
    checkedIsEmulator();
  }, []);

  if (isIOS && isEmulator) {
    return <Text style={styles.container}>CallKeep doesn't work on iOS emulator</Text>;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={displayIncomingCallNow} style={styles.button} hitSlop={hitSlop}>
        <Text>Display incoming call now</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={displayIncomingCallDelayed} style={styles.button} hitSlop={hitSlop}>
        <Text>Display incoming call now in 3s</Text>
      </TouchableOpacity>

      {Object.keys(calls).map(callUUID => (
        <View key={callUUID} style={styles.callButtons}>
          <TouchableOpacity
            onPress={() => setOnHold(callUUID, !heldCalls[callUUID])}
            style={styles.button}
            hitSlop={hitSlop}>
            <Text>
              {heldCalls[callUUID] ? 'Unhold' : 'Hold'} {calls[callUUID]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => updateDisplay(callUUID)} style={styles.button} hitSlop={hitSlop}>
            <Text>Update display</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOnMute(callUUID, !mutedCalls[callUUID])}
            style={styles.button}
            hitSlop={hitSlop}>
            <Text>
              {mutedCalls[callUUID] ? 'Unmute' : 'Mute'} {calls[callUUID]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => hangup(callUUID)} style={styles.button} hitSlop={hitSlop}>
            <Text>Hangup {calls[callUUID]}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <ScrollView style={styles.logContainer}>
        <Text style={styles.log}>{logText}</Text>
      </ScrollView>
    </View>
  );
}
