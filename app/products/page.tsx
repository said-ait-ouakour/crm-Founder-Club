"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, X, Loader2, Trash2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useIsRecruiter } from "@/contexts/auth-context"

interface Product {
	id: number
	name: string | null
	subject: string | null
	unit_group: string | null
	default_unit: string | null
	currency: string | null
	valid_from: string | null
	valid_to: string | null
	product_type: string | null
	quantity_on_hand: number | null
	url: string | null
	default_price_list: string | null
	decimals_supported: number | null
	standard_cost: number | null
	current_cost: number | null
	vendor: string | null
	vendor_part_number: string | null
	stock_weight: number | null
	stock_volume: number | null
	price_list: string | null
}

interface ProductTableRow {
	id: number
	name: string | null
	standard_cost: number | null
	price_list: string | null
	product_type: string | null
}

export default function ProductsPage() {
	const isRecruiter = useIsRecruiter();
	
	// Check if user has access to products page (recruiters cannot access)
	if (isRecruiter) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="text-6xl mb-4">🚫</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
					<p className="text-gray-600 mb-4">
						You don't have permission to access the products page.
					</p>
					<p className="text-sm text-gray-500">
						Recruiters can only access the recruitment page.
					</p>
				</div>
			</div>
		);
	}

	const [showForm, setShowForm] = useState(false)
	const [products, setProducts] = useState<ProductTableRow[]>([])
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [formData, setFormData] = useState({
		name: "",
		subject: "",
		unit_group: "",
		default_unit: "",
		currency: "",
		valid_from: "",
		valid_to: "",
		product_type: "",
		quantity_on_hand: "",
		url: "",
		default_price_list: "",
		decimals_supported: "",
		standard_cost: "",
		current_cost: "",
		vendor: "",
		vendor_part_number: "",
		stock_weight: "",
		stock_volume: "",
		price_list: ""
	})

	const supabase = createClientComponentClient()

	// Fetch products from database
	useEffect(() => {
		fetchProducts()
	}, [])

	const fetchProducts = async () => {
		try {
			setLoading(true)
			const { data, error } = await supabase
				.from('products')
				.select('id, name, standard_cost, price_list, product_type')
				.order('name')

			if (error) {
				console.error('Error fetching products:', error)
				return
			}

			setProducts(data || [])
		} catch (error) {
			console.error('Error fetching products:', error)
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
			const newProductData = {
				name: formData.name || null,
				subject: formData.subject || null,
				unit_group: formData.unit_group || null,
				default_unit: formData.default_unit || null,
				currency: formData.currency || null,
				valid_from: formData.valid_from || null,
				valid_to: formData.valid_to || null,
				product_type: formData.product_type || null,
				quantity_on_hand: formData.quantity_on_hand ? parseFloat(formData.quantity_on_hand) : null,
				url: formData.url || null,
				default_price_list: formData.default_price_list || null,
				decimals_supported: formData.decimals_supported ? parseInt(formData.decimals_supported) : null,
				standard_cost: formData.standard_cost ? parseFloat(formData.standard_cost) : null,
				current_cost: formData.current_cost ? parseFloat(formData.current_cost) : null,
				vendor: formData.vendor || null,
				vendor_part_number: formData.vendor_part_number || null,
				stock_weight: formData.stock_weight ? parseFloat(formData.stock_weight) : null,
				stock_volume: formData.stock_volume ? parseFloat(formData.stock_volume) : null,
				price_list: formData.price_list || null
			}

			// Insert new product into database
			const { data, error } = await supabase
				.from('products')
				.insert([newProductData])
				.select()

			if (error) {
				console.error('Error creating product:', error)
				// You might want to show a toast notification here
				return
			}

			// Refresh the products list
			await fetchProducts()

			// Reset form
			setFormData({
				name: "",
				subject: "",
				unit_group: "",
				default_unit: "",
				currency: "",
				valid_from: "",
				valid_to: "",
				product_type: "",
				quantity_on_hand: "",
				url: "",
				default_price_list: "",
				decimals_supported: "",
				standard_cost: "",
				current_cost: "",
				vendor: "",
				vendor_part_number: "",
				stock_weight: "",
				stock_volume: "",
				price_list: ""
			})

			// Hide form
			setShowForm(false)
		} catch (error) {
			console.error('Error creating product:', error)
		} finally {
			setSubmitting(false)
		}
	}

	const handleDelete = async (productId: number) => {
		try {
			setDeleting(true)
			
			const { error } = await supabase
				.from('products')
				.delete()
				.eq('id', productId)

			if (error) {
				console.error('Error deleting product:', error)
				return
			}

			// Refresh the products list
			await fetchProducts()
		} catch (error) {
			console.error('Error deleting product:', error)
		} finally {
			setDeleting(false)
		}
	}

	const handleCancel = () => {
		setShowForm(false)
		setFormData({
			name: "",
			subject: "",
			unit_group: "",
			default_unit: "",
			currency: "",
			valid_from: "",
			valid_to: "",
			product_type: "",
			quantity_on_hand: "",
			url: "",
			default_price_list: "",
			decimals_supported: "",
			standard_cost: "",
			current_cost: "",
			vendor: "",
			vendor_part_number: "",
			stock_weight: "",
			stock_volume: "",
			price_list: ""
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
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
				<p className="text-gray-600">Manage your financial product offerings</p>
			</div>

			{/* Add New Product Button */}
			<div className="mb-6">
				<Button 
					onClick={() => setShowForm(true)}
					className="flex items-center gap-2"
				>
					<Plus className="h-4 w-4" />
					Add New Product
				</Button>
			</div>

			{/* Add New Product Form */}
			{showForm && (
				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							Add New Product
							<Button
								variant="ghost"
								size="sm"
								onClick={handleCancel}
								className="h-8 w-8 p-0"
							>
								<X className="h-4 w-4" />
							</Button>
						</CardTitle>
						<CardDescription>Fill in the details for the new product</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Basic Information */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="name">Product Name *</Label>
										<Input
											id="name"
											value={formData.name}
											onChange={(e) => handleInputChange("name", e.target.value)}
											placeholder="Enter product name"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="subject">Subject</Label>
										<Input
											id="subject"
											value={formData.subject}
											onChange={(e) => handleInputChange("subject", e.target.value)}
											placeholder="Enter subject"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="product_type">Product Type *</Label>
										<Input
											id="product_type"
											value={formData.product_type}
											onChange={(e) => handleInputChange("product_type", e.target.value)}
											placeholder="Enter product type"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="price_list">Price List *</Label>
										<Select
											value={formData.price_list}
											onValueChange={(value) => handleInputChange("price_list", value)}
											required
										>
											<SelectTrigger>
												<SelectValue placeholder="Select price list" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Financial">Financial</SelectItem>
												<SelectItem value="Legal">Legal</SelectItem>
												<SelectItem value="Standard">Standard</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							{/* Units and Currency */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Units & Currency</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="unit_group">Unit Group</Label>
										<Input
											id="unit_group"
											value={formData.unit_group}
											onChange={(e) => handleInputChange("unit_group", e.target.value)}
											placeholder="Enter unit group"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="default_unit">Default Unit</Label>
										<Input
											id="default_unit"
											value={formData.default_unit}
											onChange={(e) => handleInputChange("default_unit", e.target.value)}
											placeholder="Enter default unit"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="currency">Currency</Label>
										<Input
											id="currency"
											value={formData.currency}
											onChange={(e) => handleInputChange("currency", e.target.value)}
											placeholder="e.g., GBP, USD"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="decimals_supported">Decimals Supported</Label>
										<Input
											id="decimals_supported"
											type="number"
											min="0"
											max="10"
											value={formData.decimals_supported}
											onChange={(e) => handleInputChange("decimals_supported", e.target.value)}
											placeholder="0"
										/>
									</div>
								</div>
							</div>

							{/* Validity Period */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Validity Period</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="valid_from">Valid From</Label>
										<Input
											id="valid_from"
											type="date"
											value={formData.valid_from}
											onChange={(e) => handleInputChange("valid_from", e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="valid_to">Valid To</Label>
										<Input
											id="valid_to"
											type="date"
											value={formData.valid_to}
											onChange={(e) => handleInputChange("valid_to", e.target.value)}
										/>
									</div>
								</div>
							</div>

							{/* Costs and Pricing */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Costs & Pricing</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="standard_cost">Standard Cost *</Label>
										<Input
											id="standard_cost"
											type="number"
											step="0.01"
											value={formData.standard_cost}
											onChange={(e) => handleInputChange("standard_cost", e.target.value)}
											placeholder="0.00"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="current_cost">Current Cost</Label>
										<Input
											id="current_cost"
											type="number"
											step="0.01"
											value={formData.current_cost}
											onChange={(e) => handleInputChange("current_cost", e.target.value)}
											placeholder="0.00"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="default_price_list">Default Price List</Label>
										<Input
											id="default_price_list"
											value={formData.default_price_list}
											onChange={(e) => handleInputChange("default_price_list", e.target.value)}
											placeholder="Enter default price list"
										/>
									</div>
								</div>
							</div>

							{/* Inventory */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Inventory</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="quantity_on_hand">Quantity on Hand</Label>
										<Input
											id="quantity_on_hand"
											type="number"
											step="0.01"
											value={formData.quantity_on_hand}
											onChange={(e) => handleInputChange("quantity_on_hand", e.target.value)}
											placeholder="0.00"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="stock_weight">Stock Weight</Label>
										<Input
											id="stock_weight"
											type="number"
											step="0.01"
											value={formData.stock_weight}
											onChange={(e) => handleInputChange("stock_weight", e.target.value)}
											placeholder="0.00"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="stock_volume">Stock Volume</Label>
										<Input
											id="stock_volume"
											type="number"
											step="0.01"
											value={formData.stock_volume}
											onChange={(e) => handleInputChange("stock_volume", e.target.value)}
											placeholder="0.00"
										/>
									</div>
								</div>
							</div>

							{/* Vendor Information */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Vendor Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="vendor">Vendor</Label>
										<Input
											id="vendor"
											value={formData.vendor}
											onChange={(e) => handleInputChange("vendor", e.target.value)}
											placeholder="Enter vendor name"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="vendor_part_number">Vendor Part Number</Label>
										<Input
											id="vendor_part_number"
											value={formData.vendor_part_number}
											onChange={(e) => handleInputChange("vendor_part_number", e.target.value)}
											placeholder="Enter vendor part number"
										/>
									</div>
								</div>
							</div>

							{/* Additional Information */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
								<div className="space-y-2">
									<Label htmlFor="url">URL</Label>
									<Input
										id="url"
										type="url"
										value={formData.url}
										onChange={(e) => handleInputChange("url", e.target.value)}
										placeholder="https://example.com"
									/>
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
										'Create Product'
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

			{/* Products Table */}
			<Card>
				<CardHeader>
					<CardTitle>Existing Products</CardTitle>
					<CardDescription>All products in your portfolio ({products.length} products)</CardDescription>
				</CardHeader>
				<CardContent>
					{products.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							No products found. Create your first product to get started.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Standard Cost</TableHead>
									<TableHead>Price List</TableHead>
									<TableHead>Product Type</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.map((product) => (
									<TableRow key={product.id}>
										<TableCell className="font-medium">{product.name || '-'}</TableCell>
										<TableCell>
											{product.standard_cost ? `£${product.standard_cost.toFixed(2)}` : '-'}
										</TableCell>
										<TableCell>
											{product.price_list ? (
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													product.price_list === "Financial" 
														? "bg-blue-100 text-blue-800"
														: product.price_list === "Legal"
														? "bg-purple-100 text-purple-800"
														: "bg-gray-100 text-gray-800"
												}`}>
													{product.price_list}
												</span>
											) : (
												'-'
											)}
										</TableCell>
										<TableCell>{product.product_type || '-'}</TableCell>
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
															Are you sure you want to remove "{product.name || 'this product'}"? This action cannot be undone.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => handleDelete(product.id)}
															className="bg-red-600 hover:bg-red-700"
														>
															{deleting ? (
																<>
																	<Loader2 className="h-4 w-4 animate-spin mr-2" />
																	Deleting...
																</>
															) : (
																'Delete Product'
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
