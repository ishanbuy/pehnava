import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, TextInput, TouchableOpacity } from "react-native";
import { useRoute } from '@react-navigation/native';
import { generateClient } from "aws-amplify/data";
import type { Schema } from "./amplify/data/resource";
import { GraphQLError } from "graphql";

const client = generateClient<Schema>();

const ClothingList = () => {
  const route = useRoute();
  const { wardrobeId } = route.params as { wardrobeId: string }; // Ensure wardrobeId is the correct type
  
  const [clothes, setClothes] = useState<Schema["Clothing"]["type"][]>([]);
  const [errors, setErrors] = useState<GraphQLError | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // New clothing state
  const [newClothing, setNewClothing] = useState({
    brand: "",
    material: "",
    size: "",
    yearBought: "",
    clothingType: ""
  });

  // Fetch clothes for the wardrobe on load and listen for real-time updates
  useEffect(() => {
    console.log("Subscribing to clothing items for wardrobeId:", wardrobeId);
    const subscription = client.models.Clothing.observeQuery({
      filter: { wardrobeID: { eq: wardrobeId } },
    }).subscribe({
      next: ({ items }) => {
        console.log("Received items:", items);
        setClothes(items);
      },
      error: (err) => {
        console.error("Subscription error:", err);
        setErrors(err as GraphQLError);
      },
    });
  
    return () => {
      console.log("Unsubscribing");
      subscription.unsubscribe();
    };
  });

  const renderClothingItems = () => {
    return clothes.map((clothing) => (
      <View key={clothing.id} style={styles.clothingItemContainer}>
        <Text style={styles.clothingItemText}>
          {clothing.brand} - {clothing.size}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={async () => {
            try {
              await client.models.Clothing.delete({ id: clothing.id });
              console.log("Deleted clothing item successfully");
              // No need to manually filter out the item as the subscription will handle it
            } catch (error) {
              console.error("Error deleting clothing item:", error);
              if (error instanceof GraphQLError) {
                setErrors(error);
              }
            }
          }}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    ));
  };
  

  // Create a new clothing entry
  const createClothing = async () => {
    if (newClothing.brand.trim() && newClothing.size.trim()) {
      try {
        await client.models.Clothing.create({
          ...newClothing,
          wardrobeID: wardrobeId, // Using wardrobeId from the route
          yearBought: newClothing.yearBought, // Ensure yearBought is a number
        });
        renderClothingItems();
        setModalVisible(false); // Hide the modal after creating the clothing
        setNewClothing({
          brand: "",
          material: "",
          size: "",
          yearBought: "",
          clothingType: ""
        }); // Reset fields
      } catch (error) {
        console.error("Creation error:", error);
        if (error instanceof GraphQLError) {
          setErrors(error);
        }
      }
    } else {
      alert("Please fill in all required fields."); // Simple validation
    }
  };

  // Handle clothing item deletion
  const handleDelete = async (clothingId: string) => {
    try {
      await client.models.Clothing.delete({ id: clothingId });
    } catch (error) {
      console.error("Error deleting clothing item:", error);
      if (error instanceof GraphQLError) {
        setErrors(error);
      }
    }
  };

  // Handle errors during data fetching
  if (errors) {
    return <Text style={styles.errorText}>{errors.message}</Text>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {clothes.length > 0 ? (
          renderClothingItems()
        ) : (
          <Text style={styles.emptyText}>The Clothing list is empty.</Text>
        )}
      </ScrollView>

      {/* Modal for entering clothing details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text>Enter clothing details:</Text>
            <TextInput
              style={styles.input}
              placeholder="Brand"
              value={newClothing.brand}
              onChangeText={(text) => setNewClothing(prev => ({ ...prev, brand: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Material"
              value={newClothing.material}
              onChangeText={(text) => setNewClothing(prev => ({ ...prev, material: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Size"
              value={newClothing.size}
              onChangeText={(text) => setNewClothing(prev => ({ ...prev, size: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Year Bought"
              keyboardType="numeric"
              value={newClothing.yearBought}
              onChangeText={(text) => setNewClothing(prev => ({ ...prev, yearBought: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Clothing Type"
              value={newClothing.clothingType}
              onChangeText={(text) => setNewClothing(prev => ({ ...prev, clothingType: text }))}
            />
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={ () => {createClothing(); renderClothingItems();}}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {setModalVisible(false); setNewClothing({
                brand: "",
                material: "",
                size: "",
                yearBought: "",
                clothingType: ""
              }); renderClothingItems();}}
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
  },
  scrollContainer: {
    flexGrow: 1,
  },
  clothingItemContainer: {
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
  clothingItemText: {
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
    backgroundColor: "black",
    padding: 5,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default ClothingList;
