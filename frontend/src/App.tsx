import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NewDashboardPage as DashboardPage } from './pages/NewDashboardPage';
import ActivityDetailsPage from './pages/ActivityDetailsPage';
import { StravaCallbackPage } from './pages/StravaCallbackPage';
import { GarminCallbackPage } from './pages/GarminCallbackPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { SleepPage } from './pages/SleepPage';
import { WorkoutLibraryPage } from './pages/WorkoutLibraryPage';
import { WorkoutDetailPage } from './pages/WorkoutDetailPage';
import { WorkoutCreatorPage } from './pages/WorkoutCreatorPage';
import { TodayWorkoutPage } from './pages/TodayWorkoutPage';
import { WeeklyPlanPage } from './pages/WeeklyPlanPage';
import { FullPlanPage } from './pages/FullPlanPage';
import { TrainingSetupPage } from './pages/TrainingSetupPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/strava/callback" element={<StravaCallbackPage />} />
            <Route path="/garmin/callback" element={<GarminCallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/activities/:id" element={<ActivityDetailsPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/sleep" element={<SleepPage />} />
                <Route path="/workout/today" element={<TodayWorkoutPage />} />
                <Route path="/workout/week" element={<WeeklyPlanPage />} />
                <Route path="/workout/plan" element={<FullPlanPage />} />
                <Route path="/workouts" element={<WorkoutLibraryPage />} />
                <Route path="/workouts/create" element={<WorkoutCreatorPage />} />
                <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
                <Route path="/workouts/:id/edit" element={<WorkoutCreatorPage />} />
                <Route path="/training-setup" element={<TrainingSetupPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
