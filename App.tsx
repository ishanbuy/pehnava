import React from "react";
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity } from "react-native";
import { Amplify } from "aws-amplify";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import outputs from "./amplify_outputs.json";
import WardrobeList from "./WardrobeList";
import ClothingList from "./ClothingList"; // Import your new screen

Amplify.configure(outputs);

const Stack = createStackNavigator();

const SignOutButton = () => {
  const { signOut } = useAuthenticator();

  return (
    <View style={styles.signOutContainer}>
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const App = () => {
  return (
    <Authenticator.Provider>
      <Authenticator>
        <NavigationContainer>
          <SafeAreaView style={styles.container}>
            <SignOutButton />
            <Stack.Navigator>
              <Stack.Screen name="WardrobeList" component={WardrobeList} />
              <Stack.Screen name="ClothingList" component={ClothingList} />
            </Stack.Navigator>
          </SafeAreaView>
        </NavigationContainer>
      </Authenticator>
    </Authenticator.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  signOutContainer: {
    alignSelf: "flex-end",
    margin: 16, 
  },
  signOutButton: {
    backgroundColor: "#e16122",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4, 
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
