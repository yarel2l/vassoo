"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Camera, Save, Shield, Bell, User, Trash2, Loader2, MapPin, Plus, Check, Pencil, Eye, EyeOff, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { AddressAutocomplete } from "@/components/address-autocomplete"

interface UserAddress {
  id: string
  label: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip_code: string
  country: string
  is_default: boolean
}

interface NotificationPreferences {
  email: boolean
  push: boolean
  order_updates: boolean
  promotions: boolean
}

const defaultNotifications: NotificationPreferences = {
  email: true,
  push: true,
  order_updates: true,
  promotions: false,
}

export default function AccountPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading, refreshAuth, isAgeVerified } = useAuth()
  const supabase = createClient()

  // Profile state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    birth_date: "",
  })

  // Addresses state
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({
    label: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US",
    is_default: false,
  })

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Password change state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        birth_date: profile.birth_date || "",
      })
      // Load notification preferences from profile
      if (profile.notification_preferences) {
        const prefs = profile.notification_preferences as NotificationPreferences
        setNotifications({ ...defaultNotifications, ...prefs })
      }
    }
  }, [profile])

  // Load addresses
  const loadAddresses = useCallback(async () => {
    if (!user) return
    
    setIsLoadingAddresses(true)
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error) {
      console.error('Error loading addresses:', error)
      toast({
        title: "Error",
        description: "Could not load your addresses",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAddresses(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      loadAddresses()
    }
  }, [user, loadAddresses])

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshAuth()
      setIsEditing(false)
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "Could not save your profile",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    if (file.size > 1024 * 1024) { // 1MB limit
      toast({
        title: "File too large",
        description: "Please select an image under 1MB",
        variant: "destructive",
      })
      return
    }

    setIsUploadingAvatar(true)
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshAuth()
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been changed",
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Upload failed",
        description: "Could not upload your avatar",
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Save notification preferences
  const handleSaveNotifications = async (newPrefs: NotificationPreferences) => {
    if (!user) return
    
    setIsSavingNotifications(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: newPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
      setNotifications(newPrefs)
    } catch (error) {
      console.error('Error saving notifications:', error)
      toast({
        title: "Error",
        description: "Could not save notification preferences",
        variant: "destructive",
      })
    } finally {
      setIsSavingNotifications(false)
    }
  }

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...notifications, [key]: value }
    setNotifications(newPrefs)
    handleSaveNotifications(newPrefs)
  }

  // Address management
  const openAddressDialog = (address?: UserAddress) => {
    if (address) {
      setEditingAddress(address)
      setAddressForm({
        label: address.label,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || "",
        city: address.city,
        state: address.state,
        zip_code: address.zip_code,
        country: address.country,
        is_default: address.is_default,
      })
    } else {
      setEditingAddress(null)
      setAddressForm({
        label: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        zip_code: "",
        country: "US",
        is_default: addresses.length === 0, // Default if first address
      })
    }
    setIsAddressDialogOpen(true)
  }

  const handleSaveAddress = async () => {
    if (!user) return
    
    // Validation
    if (!addressForm.label || !addressForm.address_line1 || !addressForm.city || !addressForm.state || !addressForm.zip_code) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSavingAddress(true)
    try {
      // If setting as default, unset other defaults first
      if (addressForm.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
      }

      if (editingAddress) {
        // Update existing
        const { error } = await supabase
          .from('user_addresses')
          .update({
            label: addressForm.label,
            address_line1: addressForm.address_line1,
            address_line2: addressForm.address_line2 || null,
            city: addressForm.city,
            state: addressForm.state.toUpperCase(),
            zip_code: addressForm.zip_code,
            country: addressForm.country,
            is_default: addressForm.is_default,
          })
          .eq('id', editingAddress.id)

        if (error) throw error
        toast({ title: "Address updated" })
      } else {
        // Create new
        const { error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: user.id,
            label: addressForm.label,
            address_line1: addressForm.address_line1,
            address_line2: addressForm.address_line2 || null,
            city: addressForm.city,
            state: addressForm.state.toUpperCase(),
            zip_code: addressForm.zip_code,
            country: addressForm.country,
            is_default: addressForm.is_default,
          })

        if (error) throw error
        toast({ title: "Address added" })
      }

      setIsAddressDialogOpen(false)
      loadAddresses()
    } catch (error) {
      console.error('Error saving address:', error)
      toast({
        title: "Error",
        description: "Could not save address",
        variant: "destructive",
      })
    } finally {
      setIsSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)

      if (error) throw error
      toast({ title: "Address deleted" })
      loadAddresses()
    } catch (error) {
      console.error('Error deleting address:', error)
      toast({
        title: "Error",
        description: "Could not delete address",
        variant: "destructive",
      })
    }
  }

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user) return
    
    try {
      // Unset all defaults
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // Set new default
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId)

      if (error) throw error
      toast({ title: "Default address updated" })
      loadAddresses()
    } catch (error) {
      console.error('Error setting default address:', error)
      toast({
        title: "Error",
        description: "Could not set default address",
        variant: "destructive",
      })
    }
  }

  // Handle address autocomplete
  const handleAddressSelect = (addressData: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }) => {
    setAddressForm(prev => ({
      ...prev,
      address_line1: addressData.street,
      city: addressData.city || "",
      state: addressData.state || "",
      zip_code: addressData.zipCode || "",
      country: addressData.country || "US",
    }))
  }

  // Handle password change
  const handleChangePassword = async () => {
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    // Validate minimum length
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      })
      
      // Reset form and close modal
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      })
      setIsPasswordDialogOpen(false)
    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        title: "Error",
        description: "No se pudo cambiar la contraseña. Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (profileData.full_name) {
      return profileData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
        <Footer />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    router.push('/login?returnUrl=/account')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-gray-400">Manage your account information and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Profile Information</CardTitle>
                  <CardDescription className="text-gray-400">
                    Update your personal information and profile picture
                  </CardDescription>
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
                  disabled={isSaving}
                  className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                  <AvatarFallback className="text-lg bg-gray-700 text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                      disabled={isUploadingAvatar}
                      asChild
                    >
                      <span>
                        {isUploadingAvatar ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4 mr-2" />
                        )}
                        Change Photo
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                  <p className="text-sm text-gray-400 mt-1">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName" className="text-gray-300">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-gray-700 border-gray-600 text-white disabled:opacity-60"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-700 border-gray-600 text-white opacity-60"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-gray-700 border-gray-600 text-white disabled:opacity-60"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-gray-300">
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.birth_date}
                    disabled
                    className="bg-gray-700 border-gray-600 text-white opacity-60"
                  />
                  <p className="text-xs text-gray-500">Contact support to update</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Age Verification</Label>
                  <div className="flex items-center gap-2">
                    {isAgeVerified ? (
                      <Badge className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Verified (21+)
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-600">
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Addresses */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Delivery Addresses
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your saved delivery addresses
                  </CardDescription>
                </div>
                <Button
                  onClick={() => openAddressDialog()}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAddresses ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No saved addresses</p>
                  <p className="text-sm text-gray-500">Add an address for faster checkout</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="flex items-start justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{address.label}</span>
                          {address.is_default && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">{address.address_line1}</p>
                        {address.address_line2 && (
                          <p className="text-sm text-gray-300">{address.address_line2}</p>
                        )}
                        <p className="text-sm text-gray-400">
                          {address.city}, {address.state} {address.zip_code}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!address.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultAddress(address.id)}
                            className="text-gray-400 hover:text-white"
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAddressDialog(address)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-400 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-800 border-gray-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Delete Address</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to delete &quot;{address.label}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-700 text-white border-gray-600">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAddress(address.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-gray-400">Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">Order Updates</Label>
                  <p className="text-sm text-gray-400">Get notified about your order status</p>
                </div>
                <Switch
                  checked={notifications.order_updates}
                  onCheckedChange={(value) => handleNotificationChange("order_updates", value)}
                  disabled={isSavingNotifications}
                />
              </div>
              <Separator className="bg-gray-700" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">Email Notifications</Label>
                  <p className="text-sm text-gray-400">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(value) => handleNotificationChange("email", value)}
                  disabled={isSavingNotifications}
                />
              </div>
              <Separator className="bg-gray-700" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">Push Notifications</Label>
                  <p className="text-sm text-gray-400">Receive push notifications on your device</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(value) => handleNotificationChange("push", value)}
                  disabled={isSavingNotifications}
                />
              </div>
              <Separator className="bg-gray-700" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">Promotions & Offers</Label>
                  <p className="text-sm text-gray-400">Receive promotional emails and special offers</p>
                </div>
                <Switch
                  checked={notifications.promotions}
                  onCheckedChange={(value) => handleNotificationChange("promotions", value)}
                  disabled={isSavingNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-gray-400">Manage your account security and privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">Password</Label>
                  <p className="text-sm text-gray-400">Change your account password</p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                  onClick={() => setIsPasswordDialogOpen(true)}
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-gray-800 border-red-600/50">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-gray-400">Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-red-600/50 bg-red-950/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  Once you delete your account, there is no going back. Please be certain.
                </AlertDescription>
              </Alert>
              <div className="mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-800 border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Your Account?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers, including your order history,
                        saved addresses, and preferences.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 text-white border-gray-600">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => {
                          toast({
                            title: "Contact Support",
                            description: "Please contact support@vassoo.com to delete your account",
                          })
                        }}
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Address Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingAddress ? 'Update your delivery address' : 'Add a new delivery address'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={addressForm.label}
                onChange={(e) => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Home, Office, Mom's House"
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <AddressAutocomplete
                value={addressForm.address_line1}
                onChange={(value) => setAddressForm(prev => ({ ...prev, address_line1: value }))}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing your address..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Apartment, Suite, etc.</Label>
              <Input
                id="address_line2"
                value={addressForm.address_line2}
                onChange={(e) => setAddressForm(prev => ({ ...prev, address_line2: e.target.value }))}
                placeholder="Apt 4B, Suite 100, etc."
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="NY"
                  maxLength={2}
                  className="bg-gray-700 border-gray-600 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  value={addressForm.zip_code}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="10001"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={addressForm.country}
                  disabled
                  className="bg-gray-700 border-gray-600 opacity-60"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="is_default"
                checked={addressForm.is_default}
                onCheckedChange={(checked) => setAddressForm(prev => ({ ...prev, is_default: checked }))}
              />
              <Label htmlFor="is_default" className="text-sm">
                Set as default delivery address
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddressDialogOpen(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAddress}
              disabled={isSavingAddress}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSavingAddress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Address'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your new password below. Password must be at least 6 characters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password *</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="bg-gray-700 border-gray-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="bg-gray-700 border-gray-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {passwordForm.newPassword && passwordForm.confirmPassword && 
             passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-red-400 text-sm">Passwords do not match</p>
            )}

            {passwordForm.newPassword && passwordForm.newPassword.length < 6 && (
              <p className="text-amber-400 text-sm">Password must be at least 6 characters</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false)
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
                setShowPasswords({ current: false, new: false, confirm: false })
              }}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isChangingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
