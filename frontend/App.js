import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import HomeScreen from "./screens/HomeScreen"
import BillsScreen from "./screens/BillsScreen"
import TransactionsScreen from "./screens/TransactionsScreen"
import BudgetScreen from "./screens/BudgetScreen"
import AccountsScreen from "./screens/AccountsScreen"
import CashFlowScreen from "./screens/CashFlowScreen"
import AddBillModal from "./components/AddBillModal"
import AddExpenseModal from "./components/AddExpenseModal"
import AddIncomeModal from "./components/AddIncomeModal"
import AddTransferModal from "./components/AddTransferModal"
import BudgetTypeScreen from "./components/BudgetFlow/BudgetTypeScreen"
import BudgetDetailsScreen from "./components/BudgetFlow/BudgetDetailsScreen"
import BudgetReviewScreen from "./components/BudgetFlow/BudgetReviewScreen"
import AccountDetailScreen from "./screens/AccountDetailScreen"
import SearchTransactionsScreen from "./screens/SearchTransactionsScreen"
import { Ionicons } from "@expo/vector-icons"
import { AccountsProvider } from "./context/AccountsContext"
import { TouchableOpacity } from "react-native"
import CategoryManagementScreen from "./screens/drawer/CategoryManagementScreen"

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline"
          } else if (route.name === "Bills") {
            iconName = focused ? "document-text" : "document-text-outline"
          } else if (route.name === "Transactions") {
            iconName = focused ? "list" : "list-outline"
          } else if (route.name === "Budget") {
            iconName = focused ? "bar-chart" : "bar-chart-outline"
          } else if (route.name === "Accounts") {
            iconName = focused ? "business" : "business-outline"
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: "#0284c7",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bills" component={BillsScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
    </Tab.Navigator>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AccountsProvider>
          <NavigationContainer>
            <Stack.Navigator
              mode="modal"
              screenOptions={{}}
            >
              <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
              <Stack.Screen
                name="CategoryManagementScreen"
                component={CategoryManagementScreen}
                options={{
                  headerShown: true,
                  title: "Category Management",
                  cardStyle: { backgroundColor: "#fff" },
                }}
              />
              <Stack.Screen
                name="CashFlow"
                component={CashFlowScreen}
                options={{
                  headerShown: false,
                  cardStyle: { backgroundColor: "#0f172a" },
                }}
              />
              <Stack.Screen
                name="AddExpense"
                component={AddExpenseModal}
                options={{
                  headerShown: false,
                  presentation: "modal",
                  cardStyle: { backgroundColor: "white" },
                }}
              />
              <Stack.Screen
                name="AddIncome"
                component={AddIncomeModal}
                options={{
                  headerShown: false,
                  presentation: "modal",
                  cardStyle: { backgroundColor: "white" },
                }}
              />
              <Stack.Screen
                name="AddTransfer"
                component={AddTransferModal}
                options={{
                  headerShown: false,
                  presentation: "modal",
                  cardStyle: { backgroundColor: "white" },
                }}
              />
              <Stack.Screen
                name="AddBill"
                component={AddBillModal}
                options={{
                  headerShown: false,
                  presentation: "modal",
                  cardStyle: { backgroundColor: "white" },
                }}
              />
              <Stack.Screen
                name="BudgetTypeSelection"
                component={BudgetTypeScreen}
                options={{
                  headerShown: false,
                  presentation: "modal",
                  cardStyle: { backgroundColor: "white" },
                }}
              />
              <Stack.Screen
                name="BudgetDetailsScreen"
                component={BudgetDetailsScreen}
                options={{
                  headerShown: false,
                  cardStyle: { backgroundColor: "white" },
                }}
              />
              <Stack.Screen
                name="BudgetReviewScreen"
                component={BudgetReviewScreen}
                options={{
                  headerShown: false,
                  cardStyle: { backgroundColor: "white" },
                }}
              />
              <Stack.Screen
                name="AccountDetailScreen"
                component={AccountDetailScreen}
                options={{
                  headerShown: false,
                  cardStyle: { backgroundColor: "white" },
                }}
              />
              <Stack.Screen
                name="SearchTransactions"
                component={SearchTransactionsScreen}
                options={{
                  headerShown: false,
                  cardStyle: { backgroundColor: "#0f172a" },
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AccountsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
