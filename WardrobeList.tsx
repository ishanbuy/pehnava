import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, TextInput, TouchableOpacity } from "react-native";
import { useNavigation } from '@react-navigation/native'; // Use this hook to navigate
import { generateClient } from "aws-amplify/data";
import type { Schema } from "./amplify/data/resource";
import { GraphQLError } from "graphql";
import { StackNavigationProp } from "@react-navigation/stack";

const client = generateClient<Schema>();


const WardrobeList = () => {
  const [wardrobes, setWardrobes] = useState<Schema["Wardrobe"]["type"][]>([]);
  const [errors, setErrors] = useState<GraphQLError>();
  const [modalVisible, setModalVisible] = useState(false);
  const [newWardrobeName, setNewWardrobeName] = useState("");

  type RootStackParamList = {
    WardrobeList: undefined;
    ClothingList: { wardrobeId: string };
  };
  
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'ClothingList'>>();

  //client.models.Wardrobe = client.models.Todo; // keep this line in

  useEffect(() => {
    const sub = client.models.Wardrobe.observeQuery().subscribe({
      next: ({ items }) => {
        setWardrobes([...items]);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  const createWardrobe = async () => {
    if (newWardrobeName.trim()) {
      try {
        await client.models.Wardrobe.create({
          content: newWardrobeName,
        });
        setModalVisible(false); // Hide the modal after creating the wardrobe
        setNewWardrobeName(""); // Clear the input field
      } catch (error: unknown) {
        if (error instanceof GraphQLError) {
          setErrors(error);
        } else {
          throw error;
        }
      }
    }
  };

  if (errors) {
    return <Text>{errors.message}</Text>;
  }

  const handleWardrobePress = (wardrobeId: string) => {
    navigation.navigate("ClothingList", {wardrobeId}) // Navigate to ClothingList screen
  };

  const renderWardrobeItems = () => {
    return wardrobes.map((wardrobe) => (
      <TouchableOpacity 
        key={wardrobe.id}
        style={styles.wardrobeItemContainer}
        onPress={() => handleWardrobePress(wardrobe.id)}
      >
        <Text style={styles.wardrobeItemText}>{wardrobe.content}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={async () => {
            await client.models.Wardrobe.delete(wardrobe);
          }}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {wardrobes.length > 0 ? (
          renderWardrobeItems()
        ) : (
          <Text style={styles.emptyText}>The Wardrobe list is empty.</Text>
        )}
      </ScrollView>

      {/* Modal for entering wardrobe name */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text>Enter the name of the wardrobe:</Text>
            <TextInput
              style={styles.input}
              placeholder="Wardrobe Name"
              value={newWardrobeName}
              onChangeText={setNewWardrobeName}
            />
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={createWardrobe}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {setNewWardrobeName(""); setModalVisible(false);}}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Plus Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
    justifyContent: "space-between",
    backgroundColor:"white",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  wardrobeItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d37533",
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  wardrobeItemText: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: 300,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 40,
    width: "100%",
    borderColor: "#D3D3D3",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#A9A9A9",
    fontStyle: "italic",
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e16122',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
  },
  button: {
    marginVertical: 5,
    width: '100%',
    padding: 10,
    borderRadius: 5,
  },
  createButton: {
    backgroundColor: "#e16122",
  },
  cancelButton: {
    backgroundColor: "black",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: 'bold',
    textAlign: "center",
  },
  deleteButton: {
    backgroundColor: 'black',
    padding: 5,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default WardrobeList;
