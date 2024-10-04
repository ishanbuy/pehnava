import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, TextInput, TouchableOpacity, Image } from "react-native";
import { useRoute } from '@react-navigation/native';
import { generateClient } from "aws-amplify/data";
import type { Schema } from "./amplify/data/resource";
import { GraphQLError } from "graphql";
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadData } from 'aws-amplify/storage';
import { getUrl } from 'aws-amplify/storage';

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
    clothingType: "",
    image: "",
  });

  const [imageUris, setImageUris] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const cameraRollStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (
        cameraRollStatus.status !== "granted" ||
        cameraStatus.status !== "granted"
      ) {
        alert("Sorry, we need these permissions to make this work!");
      }
    })();
  }, []);

  

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
  }, [clothes.length]);

  useEffect(() => {
    const fetchImages = async () => {
      const updatedUris = await Promise.all(
        clothes.map(async (clothing) => {
          // Only fetch image if it's not already in the state
          if (clothing.image && !imageUris[clothing.id]) {
            try {
              const result = await getUrl({ path: clothing.image });
              return { id: clothing.id, uri: result.url.toString() };
            } catch (error) {
              console.error("Error fetching image for clothing ID", clothing.id, error);
              return { id: clothing.id, uri: "https://cdn-icons-png.flaticon.com/512/7596/7596292.png" }; // Default image on error
            }
          }
          return null; // If the image URI already exists, skip fetching
        })
      );
  
      // Update only newly fetched URIs
      const validUris = updatedUris.filter(item => item !== null);
      if (validUris.length > 0) {
        setImageUris(prev => {
          const newUris = { ...prev };
          validUris.forEach(({ id, uri }) => {
            newUris[id] = uri;
          });
          return newUris;
        });
      }
    };
  
    fetchImages();
  }, [clothes]); // Only depend on `clothes` here
  
  

  const renderClothingItems = () => {
    return clothes.map((clothing) => (
      <View key={clothing.id} style={styles.clothingItemContainer}>
        <Image 
          source={{ uri: imageUris[clothing.id] || "https://cdn-icons-png.flaticon.com/512/7596/7596292.png" }}
          style={styles.image}
        />
        <Text style={styles.clothingItemText}>
          {clothing.brand || 'Unknown'} - {clothing.size || 'N/A'}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={async () => {
            try {
              await client.models.Clothing.delete({ id: clothing.id });
              console.log("Deleted clothing item successfully");
              clothes.length -= 1;
              // No need to manually filter out the item as the subscription will handle it
              setClothes(clothes.filter(item => item.id !== clothing.id));
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


  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    }).then((response) => {
      console.log('Image picked : ', response);
      handleImagePicked(response);
    }).catch((e) => {
      console.error('Error saving photo in launchImageLibraryAsync : ', e.message);
    });
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access camera is required!');
      return;
    }
    ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    }).then((response) => {
      console.log('Image picked : ', response);
      handleImagePicked(response);
    }).catch((e) => {
      console.error('Error saving photo in launchCameraAsync : ', e.message);
    });
  };


  const handleImagePicked = async (pickerResult: ImagePicker.ImagePickerResult) => {
    try {
      if (pickerResult.assets && pickerResult.assets.length > 0) {
        const img = await fetchImageFromUri(pickerResult.assets[0].uri);
        const imageID = await uploadImage(new File([img], "image.jpg", { type: "image/jpeg" }));
        setNewClothing({...newClothing, image: imageID});
      } else {
        console.error("No assets found in pickerResult");
      }
    } catch (e) {
      console.log(e);
      alert("Upload failed");
    }
  };

  const uploadImage = async (img: File) => {
    const result = await uploadData({
      path: ({identityId}) => `photos/${identityId}.jpg`,
      data: img,
    }).result;
    const identityId = result.path.split('/')[1].split('.')[0];
    console.log("identityId : ", identityId);
    return result.path;
  };

  async function getLinkToStorageFile(identityId: string): Promise<URL> {
    return getUrl({
      path: `photos/${identityId}.jpg`,
    }).then((result) => {
      return result.url;
    });
  };  

  const fetchImageFromUri = async (uri: string) => {
    try {
      const response = await fetch(uri);
      console.log("uri : ", uri);
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error("Error fetching image from URI:", error);
      throw error;
    }
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
        clothes.length += 1;
        console.log('New clothing created : ', newClothing);
        console.log('number of clothes : ', clothes.length);
        renderClothingItems();
        setModalVisible(false); // Hide the modal after creating the clothing
        setNewClothing({
          brand: "",
          material: "",
          size: "",
          yearBought: "",
          clothingType: "",
          image: "",
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
              onPress={pickImage}
            >
              <Text style={styles.buttonText}>Add Image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={takePhoto}
            >
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
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
                clothingType: "",
                image: "",
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
  image: {
    width: 200,
    height: 200,
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
