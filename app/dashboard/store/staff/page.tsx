'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
    Users,
    Plus,
    Pencil,
    Trash2,
    Mail,
    Loader2,
    Shield,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface StaffMember {
    id: string
    userId: string
    email: string
    name: string
    avatarUrl?: string
    role: 'owner' | 'admin' | 'manager' | 'employee'
    isActive: boolean
    joinedAt: string
}

const roleConfig: Record<string, { label: string; color: string }> = {
    owner: { label: 'Owner', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    admin: { label: 'Admin', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    manager: { label: 'Manager', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    employee: { label: 'Employee', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

export default function StaffPage() {
    const { isLoading: authLoading, user } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'employee'>('employee')

    const tenantId = currentStore?.id

    const fetchStaff = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const supabase = createClient()

            const { data: memberships, error } = await supabase
                .from('tenant_memberships')
                .select(`
                    id,
                    role,
                    is_active,
                    created_at,
                    user:profiles!user_id(id, email, full_name, avatar_url)
                `)
                .eq('tenant_id', tenantId)
                .order('created_at')

            if (error) {
                console.error('Error fetching staff:', error)
                return
            }

            const transformedStaff: StaffMember[] = (memberships || []).map((m: any) => ({
                id: m.id,
                userId: m.user?.id,
                email: m.user?.email || '',
                name: m.user?.full_name || m.user?.email || 'Unknown',
                avatarUrl: m.user?.avatar_url,
                role: m.role,
                isActive: m.is_active,
                joinedAt: m.created_at,
            }))

            setStaff(transformedStaff)
        } catch (err) {
            console.error('Error in fetchStaff:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchStaff()
    }, [fetchStaff])

    const handleInvite = async () => {
        if (!tenantId || !inviteEmail) return
        setIsSubmitting(true)

        try {
            const supabase = createClient()

            // Check if user exists
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', inviteEmail.toLowerCase())
                .single()

            if (!existingUser) {
                toast({
                    title: 'User not found',
                    description: 'This email is not registered. Please ask them to create an account first.',
                    variant: 'destructive',
                })
                setIsSubmitting(false)
                return
            }

            // Check if already a member
            const { data: existingMembership } = await supabase
                .from('tenant_memberships')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('user_id', existingUser.id)
                .single()

            if (existingMembership) {
                toast({
                    title: 'Already a member',
                    description: 'This user is already a staff member.',
                    variant: 'destructive',
                })
                setIsSubmitting(false)
                return
            }

            // Add new membership
            const { error } = await supabase
                .from('tenant_memberships')
                .insert({
                    tenant_id: tenantId,
                    user_id: existingUser.id,
                    role: inviteRole,
                    is_active: true,
                })

            if (error) throw error

            toast({ title: 'Staff member added successfully' })
            fetchStaff()
            setIsDialogOpen(false)
            setInviteEmail('')
            setInviteRole('employee')
        } catch (err) {
            console.error('Error inviting staff:', err)
            toast({
                title: 'Error',
                description: 'Failed to add staff member',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdateRole = async (staffId: string, newRole: string) => {
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('tenant_memberships')
                .update({ role: newRole as any })
                .eq('id', staffId)

            if (error) throw error

            toast({ title: 'Role updated' })
            fetchStaff()
        } catch (err) {
            console.error('Error updating role:', err)
            toast({
                title: 'Error',
                description: 'Failed to update role',
                variant: 'destructive',
            })
        }
    }

    const handleRemove = async (staffId: string) => {
        if (!confirm('Are you sure you want to remove this staff member?')) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('tenant_memberships')
                .delete()
                .eq('id', staffId)

            if (error) throw error

            toast({ title: 'Staff member removed' })
            fetchStaff()
        } catch (err) {
            console.error('Error removing staff:', err)
            toast({
                title: 'Error',
                description: 'Failed to remove staff member',
                variant: 'destructive',
            })
        }
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading staff...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Staff</h1>
                    <p className="text-gray-400 mt-1">
                        Manage your store team members and permissions
                    </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff Member
                </Button>
            </div>

            {/* Staff List */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                    {staff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Users className="h-12 w-12 text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-white mb-1">No staff members</h3>
                            <p className="text-gray-400 mb-4">Add team members to help manage your store.</p>
                            <Button onClick={() => setIsDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Staff Member
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Member</TableHead>
                                    <TableHead className="text-gray-400">Email</TableHead>
                                    <TableHead className="text-gray-400">Role</TableHead>
                                    <TableHead className="text-gray-400">Joined</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.map((member) => {
                                    const isCurrentUser = member.userId === user?.id
                                    const role = roleConfig[member.role]

                                    return (
                                        <TableRow key={member.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={member.avatarUrl} />
                                                        <AvatarFallback className="bg-orange-600 text-white">
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <span className="font-medium text-white">{member.name}</span>
                                                        {isCurrentUser && (
                                                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-400">{member.email}</TableCell>
                                            <TableCell>
                                                {member.role === 'owner' ? (
                                                    <Badge className={role.color}>{role.label}</Badge>
                                                ) : (
                                                    <Select
                                                        defaultValue={member.role}
                                                        onValueChange={(v) => handleUpdateRole(member.id, v)}
                                                    >
                                                        <SelectTrigger className="w-32 h-8 bg-transparent border-gray-700 text-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-gray-900 border-gray-800">
                                                            <SelectItem value="admin" className="text-white">Admin</SelectItem>
                                                            <SelectItem value="manager" className="text-white">Manager</SelectItem>
                                                            <SelectItem value="employee" className="text-white">Employee</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {new Date(member.joinedAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    {member.role !== 'owner' && !isCurrentUser && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemove(member.id)}
                                                            className="text-red-400 hover:text-red-300"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Invite Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add Staff Member</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Invite a user to join your store team
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Email Address *</Label>
                            <Input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="member@example.com"
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            <p className="text-xs text-gray-500">
                                User must have an existing account
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Role</Label>
                            <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-800">
                                    <SelectItem value="admin" className="text-white">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-orange-400" />
                                            Admin - Full access
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="manager" className="text-white">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-blue-400" />
                                            Manager - Limited settings
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="employee" className="text-white">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-gray-400" />
                                            Employee - Orders only
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInvite}
                            disabled={isSubmitting || !inviteEmail}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Add Member'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
