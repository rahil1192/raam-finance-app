import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CategoryManagementScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Category Management</Text>
      {/* Add your category management UI here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#222' },
}); 