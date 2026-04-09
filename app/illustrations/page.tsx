"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, X, Loader2, Trash2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useIsRecruiter } from "@/contexts/auth-context"

interface Illustration {
	id: string
	name: string | null
	property_value: number | null
	property_type: string | null
	inheritance_protector: string | null
	post_code: string | null
	location: string | null
	tenure: string | null
	ex_local_authority: string | null
	funding_required: number | null
	initial_advance_amount: string | null
	spacify_amount: number | null
	created_at: string | null
}

interface IllustrationTableRow {
	id: string
	name: string | null
	property_value: number | null
	property_type: string | null
	location: string | null
	funding_required: string | null
	created_at: string | null
}

export default function IllustrationsPage() {
	const isRecruiter = useIsRecruiter();
	
	// Check if user has access to illustrations page (recruiters cannot access)
	if (isRecruiter) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="text-6xl mb-4">🚫</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
					<p className="text-gray-600 mb-4">
						You don't have permission to access the illustrations page.
					</p>
					<p className="text-sm text-gray-500">
						Recruiters can only access the recruitment page.
					</p>
				</div>
			</div>
		);
	}

	const [showForm, setShowForm] = useState(false)
	const [illustrations, setIllustrations] = useState<IllustrationTableRow[]>([])
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [formData, setFormData] = useState({
		name: "",
		property_value: "",
		property_type: "",
		inheritance_protector: "",
		post_code: "",
		location: "",
		tenure: "",
		ex_local_authority: "",
		funding_required: "",
		initial_advance_type: "maximum",
		initial_advance_amount: "",
		spacify_amount: ""
	})

	const supabase = createClientComponentClient()

	// Fetch illustrations from database
	useEffect(() => {
		fetchIllustrations()
	}, [])

	const fetchIllustrations = async () => {
		try {
			setLoading(true)
			const { data, error } = await supabase
				.from('illustrations')
				.select('id, name, property_value, property_type, location, funding_required, created_at')
				.order('created_at', { ascending: false })

			if (error) {
				console.error('Error fetching illustrations:', error)
				return
			}

			setIllustrations(data || [])
		} catch (error) {
			console.error('Error fetching illustrations:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleInputChange = (field: string, value: string) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		try {
			setSubmitting(true)

			// Prepare data for database - convert empty strings to null for optional fields
			const newIllustrationData = {
				name: formData.name || null,
				property_value: formData.property_value ? parseFloat(formData.property_value) : null,
				property_type: formData.property_type || null,
				inheritance_protector: formData.inheritance_protector || null,
				post_code: formData.post_code || null,
				location: formData.location || null,
				tenure: formData.tenure || null,
				ex_local_authority: formData.ex_local_authority || null,
				funding_required: formData.funding_required || null,
				initial_advance_amount: formData.initial_advance_type === "specified" && formData.initial_advance_amount ? parseFloat(formData.initial_advance_amount) : null,
				spacify_amount: formData.spacify_amount ? parseFloat(formData.spacify_amount) : null
			}

			// Insert new illustration into database
			const { data, error } = await supabase
				.from('illustrations')
				.insert([newIllustrationData])
				.select()

			if (error) {
				console.error('Error creating illustration:', error)
				return
			}

			// Refresh the illustrations list
			await fetchIllustrations()

			// Reset form
			setFormData({
				name: "",
				property_value: "",
				property_type: "",
				inheritance_protector: "",
				post_code: "",
				location: "",
				tenure: "",
				ex_local_authority: "",
				funding_required: "",
				initial_advance_type: "maximum",
				initial_advance_amount: "",
				spacify_amount: ""
			})

			// Hide form
			setShowForm(false)
		} catch (error) {
			console.error('Error creating illustration:', error)
		} finally {
			setSubmitting(false)
		}
	}

	const handleDelete = async (illustrationId: string) => {
		try {
			setDeleting(true)
			
			const { error } = await supabase
				.from('illustrations')
				.delete()
				.eq('id', illustrationId)

			if (error) {
				console.error('Error deleting illustration:', error)
				return
			}

			// Refresh the illustrations list
			await fetchIllustrations()
		} catch (error) {
			console.error('Error deleting illustration:', error)
		} finally {
			setDeleting(false)
		}
	}

	const handleCancel = () => {
		setShowForm(false)
		setFormData({
			name: "",
			property_value: "",
			property_type: "",
			inheritance_protector: "",
			post_code: "",
			location: "",
			tenure: "",
			ex_local_authority: "",
			funding_required: "",
			initial_advance_type: "maximum",
			initial_advance_amount: "",
			spacify_amount: ""
		})
	}

	const formatDate = (dateString: string | null) => {
		if (!dateString) return '-'
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		})
	}

	if (loading) {
		return (
			<div className="container mx-auto px-6 py-8">
				<div className="flex items-center justify-center h-64">
					<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
				</div>
			</div>
		)
	}

	return (
		<div className="container mx-auto px-6 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Illustrations</h1>
				<p className="text-gray-600">Manage and view your financial illustrations and documents</p>
			</div>

			{/* Add New Illustration Button */}
			<div className="mb-6">
				<Button 
					onClick={() => setShowForm(true)}
					className="flex items-center gap-2"
				>
					<Plus className="h-4 w-4" />
					Add New Illustration
				</Button>
			</div>

			{/* Add New Illustration Form */}
			{showForm && (
				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							Add New Illustration
							<Button
								variant="ghost"
								size="sm"
								onClick={handleCancel}
								className="h-8 w-8 p-0"
							>
								<X className="h-4 w-4" />
							</Button>
						</CardTitle>
						<CardDescription>Fill in the details for the new illustration</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Basic Information */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="name">Illustration Name *</Label>
										<Input
											id="name"
											value={formData.name}
											onChange={(e) => handleInputChange("name", e.target.value)}
											placeholder="Enter illustration name"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="property_type">Property Type</Label>
										<Select
											value={formData.property_type}
											onValueChange={(value) => handleInputChange("property_type", value)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select property type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Residential">Residential</SelectItem>
												<SelectItem value="Commercial">Commercial</SelectItem>
												<SelectItem value="Mixed Use">Mixed Use</SelectItem>
												<SelectItem value="Land">Land</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							{/* Property Details */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Property Details</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="property_value">Property Value *</Label>
										<Input
											id="property_value"
											type="number"
											step="0.01"
											value={formData.property_value}
											onChange={(e) => handleInputChange("property_value", e.target.value)}
											placeholder="0.00"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="location">Location</Label>
										<Select
											value={formData.location}
											onValueChange={(value) => handleInputChange("location", value)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select location" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="England">England</SelectItem>
												<SelectItem value="Wales">Wales</SelectItem>
												<SelectItem value="Scotland">Scotland</SelectItem>
												<SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label htmlFor="post_code">Post Code</Label>
										<Input
											id="post_code"
											value={formData.post_code}
											onChange={(e) => handleInputChange("post_code", e.target.value)}
											placeholder="Enter post code"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="tenure">Tenure</Label>
										<Select
											value={formData.tenure}
											onValueChange={(value) => handleInputChange("tenure", value)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select tenure" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Freehold">Freehold</SelectItem>
												<SelectItem value="Leasehold">Leasehold</SelectItem>
												<SelectItem value="Commonhold">Commonhold</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							{/* Financial Details */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Financial Details</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="funding_required">Funding Required *</Label>
										<Select
											value={formData.funding_required}
											onValueChange={(value) => handleInputChange("funding_required", value)}
											required
										>
											<SelectTrigger>
												<SelectValue placeholder="Select funding required" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Initial Advice">Initial Advice</SelectItem>
												<SelectItem value="Service Facility">Service Facility</SelectItem>
												<SelectItem value="Regular Payments Repay Back">Regular Payments Repay Back</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label htmlFor="initial_advance_type">Initial Advance Type</Label>
										<Select
											value={formData.initial_advance_type}
											onValueChange={(value) => handleInputChange("initial_advance_type", value)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select initial advance type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="maximum">Maximum Amount</SelectItem>
												<SelectItem value="specified">Specified Amount</SelectItem>
											</SelectContent>
										</Select>
									</div>
									{formData.initial_advance_type === "specified" && (
										<div className="space-y-2">
											<Label htmlFor="initial_advance_amount">Initial Advance Amount</Label>
											<Input
												id="initial_advance_amount"
												type="number"
												step="0.01"
												value={formData.initial_advance_amount}
												onChange={(e) => handleInputChange("initial_advance_amount", e.target.value)}
												placeholder="0.00"
											/>
										</div>
									)}
									<div className="space-y-2">
										<Label htmlFor="spacify_amount">Spacify Amount</Label>
										<Input
											id="spacify_amount"
											type="number"
											step="0.01"
											value={formData.spacify_amount}
											onChange={(e) => handleInputChange("spacify_amount", e.target.value)}
											placeholder="0.00"
										/>
									</div>
								</div>
							</div>

							{/* Additional Information */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="inheritance_protector">Inheritance Protector</Label>
										<Select
											value={formData.inheritance_protector}
											onValueChange={(value) => handleInputChange("inheritance_protector", value)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select inheritance protector" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Yes">Yes</SelectItem>
												<SelectItem value="No">No</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label htmlFor="ex_local_authority">Ex Local Authority</Label>
										<Select
											value={formData.ex_local_authority}
											onValueChange={(value) => handleInputChange("ex_local_authority", value)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select ex local authority" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Yes">Yes</SelectItem>
												<SelectItem value="No">No</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							<div className="flex gap-2">
								<Button type="submit" disabled={submitting}>
									{submitting ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
											Creating...
										</>
									) : (
										'Create Illustration'
									)}
								</Button>
								<Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
									Cancel
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			)}

			{/* Illustrations Table */}
			<Card>
				<CardHeader>
					<CardTitle>Existing Illustrations</CardTitle>
					<CardDescription>All illustrations in your portfolio ({illustrations.length} illustrations)</CardDescription>
				</CardHeader>
				<CardContent>
					{illustrations.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							No illustrations found. Create your first illustration to get started.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Property Value</TableHead>
									<TableHead>Property Type</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Funding Required</TableHead>
									<TableHead>Created</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{illustrations.map((illustration) => (
									<TableRow key={illustration.id}>
										<TableCell className="font-medium">{illustration.name || '-'}</TableCell>
										<TableCell>
											{illustration.property_value ? `£${illustration.property_value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
										</TableCell>
										<TableCell>
											{illustration.property_type ? (
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													illustration.property_type === "Residential" 
														? "bg-blue-100 text-blue-800"
														: illustration.property_type === "Commercial"
														? "bg-green-100 text-green-800"
														: illustration.property_type === "Mixed Use"
														? "bg-purple-100 text-purple-800"
														: "bg-gray-100 text-gray-800"
												}`}>
													{illustration.property_type}
												</span>
											) : (
												'-'
											)}
										</TableCell>
										<TableCell>{illustration.location || '-'}</TableCell>
										<TableCell>
											{illustration.funding_required ? (
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													illustration.funding_required === "Initial Advice"
														? "bg-blue-100 text-blue-800"
														: illustration.funding_required === "Service Facility"
														? "bg-green-100 text-green-800"
														: "bg-purple-100 text-purple-800"
												}`}>
													{illustration.funding_required}
												</span>
											) : (
												'-'
											)}
										</TableCell>
										<TableCell>{formatDate(illustration.created_at)}</TableCell>
										<TableCell>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="destructive"
														size="sm"
														className="flex items-center gap-2"
														disabled={deleting}
													>
														<Trash2 className="h-4 w-4" />
														Delete
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Are you sure?</AlertDialogTitle>
														<AlertDialogDescription>
															Are you sure you want to remove "{illustration.name || 'this illustration'}"? This action cannot be undone.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => handleDelete(illustration.id)}
															className="bg-red-600 hover:bg-red-700"
														>
															{deleting ? (
																<>
																	<Loader2 className="h-4 w-4 animate-spin mr-2" />
																	Deleting...
																</>
															) : (
																'Delete Illustration'
															)}
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
