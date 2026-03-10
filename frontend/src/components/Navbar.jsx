import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { authAPI } from "../services/api";

const Navbar = ({ onLogout, user }) => {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const menuRef = useRef(null);

  const email = user?.email || "";
  const avatarLetter = email.trim() ? email.trim()[0].toUpperCase() : "U";

  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) {
        return;
      }
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openPasswordModal = () => {
    setMenuOpen(false);
    setPasswordError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword,
        newPassword,
      });
      closePasswordModal();
    } catch (error) {
      const message =
        error.response?.data?.message || "Unable to change password.";
      setPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-40 bg-[#f7f5f3]/20 dark:bg-[#1d1f1f]/60 backdrop-blur-xl backdrop-saturate-150 border-b border-[#c6c6c6]/20 dark:border-[#303030]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 transition-transform duration-300 hover:scale-[1.02]"
              >
                {/* <Wallet className="h-7 w-7 text-dark" />
                 */}
                <img src="/logo_second.png" alt="Vision" className="h-12 w-15" />
                <span className="text-2xl font-bold text-dark dark:text-white">
                  VISION
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-8 text-sm font-medium">
              <Link
                to="/dashboard"
                className={`transition-colors duration-200 ${
                  isActive("/dashboard") ||
                  location.pathname.startsWith("/dashboard/")
                    ? "text-blue-600"
                    : "text-dark/70 dark:text-white/70 hover:text-blue-600"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/ratios"
                className={`transition-colors duration-200 ${
                  isActive("/ratios")
                    ? "text-blue-600"
                    : "text-dark/70 dark:text-white/70 hover:text-blue-600"
                }`}
              >
                Ratios
              </Link>
              <Link
                to="/allocator"
                className={`transition-colors duration-200 ${
                  isActive("/allocator")
                    ? "text-blue-600"
                    : "text-dark/70 dark:text-white/70 hover:text-blue-600"
                }`}
              >
                Allocator
              </Link>
              <Link
                to="/chat"
                className={`transition-colors duration-200 ${
                  isActive("/chat")
                    ? "text-blue-600"
                    : "text-dark/70 dark:text-white/70 hover:text-blue-600"
                }`}
              >
                Chat
              </Link>
               <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-200"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-yellow-400" />
                ) : (
                  <Moon className="h-5 w-5 text-dark" />
                )}
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="h-10 w-10 rounded-full bg-blue-600/15 text-blue-700 dark:text-blue-200 border border-blue-600/20 dark:border-blue-500/30 flex items-center justify-center font-semibold uppercase"
                  aria-label="Open user menu"
                >
                  {avatarLetter}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-dark/10 dark:border-white/10 bg-white dark:bg-[#151515] shadow-xl p-4">
                    <div className="text-xs uppercase text-dark/50 dark:text-white/40">
                      Signed in as
                    </div>
                    <div className="text-sm font-semibold text-dark dark:text-white break-all mt-1">
                      {email || "Unknown user"}
                    </div>
                    <div className="h-px bg-dark/10 dark:bg-white/10 my-3" />
                    <button
                      type="button"
                      onClick={openPasswordModal}
                      className="w-full text-left text-sm font-medium text-dark/80 dark:text-white/80 hover:text-blue-600 transition-colors duration-200"
                    >
                      Change password
                    </button>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="mt-2 w-full text-left text-sm font-medium text-dark/80 dark:text-white/80 hover:text-blue-600 transition-colors duration-200"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
             
            </div>
          </div>
        </div>
      </nav>
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 pt-24 sm:pt-28">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1c1c1c] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                Change password
              </h2>
              <button
                type="button"
                onClick={closePasswordModal}
                className="text-dark/50 dark:text-white/50 hover:text-dark dark:hover:text-white"
                aria-label="Close"
              >
                X
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-dark dark:text-white/80 mb-1">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full border border-dark/20 dark:border-white/10 bg-transparent px-3 py-2 focus:outline-none focus:border-dark dark:focus:border-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark dark:text-white/80 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full border border-dark/20 dark:border-white/10 bg-transparent px-3 py-2 focus:outline-none focus:border-dark dark:focus:border-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark dark:text-white/80 mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full border border-dark/20 dark:border-white/10 bg-transparent px-3 py-2 focus:outline-none focus:border-dark dark:focus:border-white"
                />
              </div>
              {passwordError && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                  {passwordError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-4 py-2 text-sm font-medium text-dark/70 dark:text-white/70 hover:text-dark dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
