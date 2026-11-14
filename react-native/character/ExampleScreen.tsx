// Demo screen: buttons for every animation plus a tiny quiz. Copy what you need.
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Character, CharacterHandle, Variant } from './Character';

const QUESTION = { prompt: 'What does "hola" mean?', answers: ['Hello', 'Goodbye', 'Thank you'], correct: 0 };

export default function ExampleScreen() {
  const character = useRef<CharacterHandle>(null);
  const [talking, setTalking] = useState(false);
  const [variant, setVariant] = useState<Variant>('woman');

  const answer = async (index: number) => {
    setTalking(false);
    await character.current?.play(index === QUESTION.correct ? 'correct' : 'wrong');
    // the reaction has finished here: go to the next question, etc.
  };

  return (
    <View style={styles.screen}>
      <Character ref={character} variant={variant} size={200} talking={talking} />

      <View style={styles.row}>
        <Button label="Correct" onPress={() => character.current?.play('correct')} />
        <Button label="Wrong" onPress={() => character.current?.play('wrong')} />
        <Button label="Wave" onPress={() => character.current?.play('wave')} />
        <Button label={talking ? 'Stop talking' : 'Talk'} onPress={() => setTalking(t => !t)} />
        <Button label="Switch character" onPress={() => setVariant(v => (v === 'man' ? 'woman' : 'man'))} />
      </View>

      <Text style={styles.prompt}>{QUESTION.prompt}</Text>
      {QUESTION.answers.map((a, i) => <Button key={a} label={a} onPress={() => answer(i)} wide />)}
    </View>
  );
}

const Button = ({ label, onPress, wide }: { label: string; onPress: () => void; wide?: boolean }) => (
  <Pressable onPress={onPress} style={[styles.button, wide && styles.wide]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#f4f6f8' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 12 },
  prompt: { fontSize: 18, fontWeight: '600', marginVertical: 8 },
  button: { paddingVertical: 10, paddingHorizontal: 14, margin: 4, borderRadius: 12, borderWidth: 2, borderColor: '#ccd', backgroundColor: '#fff' },
  wide: { alignSelf: 'stretch' },
  buttonText: { fontSize: 16 },
});
