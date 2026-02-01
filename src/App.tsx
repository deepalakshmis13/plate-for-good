import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// NGO Pages
import NGODashboard from "./pages/ngo/NGODashboard";
import NGOVerification from "./pages/ngo/NGOVerification";

// Donor Pages
import DonorDashboard from "./pages/donor/DonorDashboard";

// Volunteer Pages
import VolunteerDashboard from "./pages/volunteer/VolunteerDashboard";
import VolunteerVerification from "./pages/volunteer/VolunteerVerification";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAuth from "./pages/admin/AdminAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* NGO Routes */}
            <Route path="/ngo" element={<NGODashboard />} />
            <Route path="/ngo/verification" element={<NGOVerification />} />

            {/* Donor Routes */}
            <Route path="/donor" element={<DonorDashboard />} />

            {/* Volunteer Routes */}
            <Route path="/volunteer" element={<VolunteerDashboard />} />
            <Route path="/volunteer/verification" element={<VolunteerVerification />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/auth" element={<AdminAuth />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
