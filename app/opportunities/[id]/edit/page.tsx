"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { opportunityService } from "@/lib/database"
import { supabase } from "@/lib/supabase"
import type { Opportunity, Contact } from "@/lib/supabase"
import { LeadSearch } from "@/components/lead-search"

interface OpportunityProduct {
  id: string // This will be the products.id for existing products, or temporary for new ones
  product_id?: number // The actual products.id from the database
  product_type: 'existing' | 'writein'
  product_name: string
  price_per_unit: number
  list_price: number
  quantity: number
  extended_amount: number
}

interface ChangedField {
  old_value: any
  new_value: any
  change_type: 'updated' | 'added' | 'removed'
}

interface ChangedFields {
  [field_name: string]: ChangedField
}

export default function EditOpportunityPage() {
  const router = useRouter()
  const params = useParams()
  const opportunityId = params.id as string

  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [products, setProducts] = useState<OpportunityProduct[]>([])
  const [originalProducts, setOriginalProducts] = useState<OpportunityProduct[]>([])
  const [advisors, setAdvisors] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [factfinds, setFactfinds] = useState<any[]>([])
  const [illustrations, setIllustrations] = useState<any[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  
  // Store original form data for change tracking
  const [originalFormData, setOriginalFormData] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    // General Information
    contact_id: "",
    opportunity_type: "",
    topic: "",
    opportunity_topic: "",
    potential_customer: "",
    fact_find: "",
    fact_find_id: "",
    main_objectives: "",
    
    // Advisor Information
    advisor: "",
    supervised_by: "",
    lead_source: "",
    
    // Report Summary
    advisor_initial_analysis: "",
    benifits: "",
    
    // Forecast Information
    revenue_user_provided: "",
    revenue_system_calculated: "",
    close_date: "",
    currency: "GBP",
    investment_manager: "",
    rating: "",
    received595_pay: "",
    paid_owner: "",
    paid_advisor: "",
    
    // Products
    price_list: "",
    
    // Illustrations
    illustration_id: "",
    
    // Legacy fields (keeping for compatibility)
    name: "",
    description: "",
    stage: "Prospecting",
    probability: "25",
    amount: "",
    expected_close_date: "",
    owner: "",
    source: "",
    type: "",
    priority: "Medium",
    status: "Open",
    notes: "",
  })

  // Function to detect changes between current and original data
  const detectChanges = (): ChangedFields => {
    if (!originalFormData) return {}
    
    const changes: ChangedFields = {}
    
    // Compare each field in formData with originalFormData
    Object.keys(formData).forEach(key => {
      const currentValue = formData[key as keyof typeof formData]
      const originalValue = originalFormData[key]
      
      // Handle different data types for comparison
      if (currentValue !== originalValue) {
        // Convert values to strings for consistent comparison
        const currentStr = String(currentValue || '')
        const originalStr = String(originalValue || '')
        
        if (currentStr !== originalStr) {
          changes[key] = {
            old_value: originalValue,
            new_value: currentValue,
            change_type: 'updated'
          }
        }
      }
    })
    
    return changes
  }

  // Function to detect product changes
  const detectProductChanges = (): { products_changed: boolean, added_products: OpportunityProduct[], removed_products: OpportunityProduct[], updated_products: OpportunityProduct[] } => {
    const added_products: OpportunityProduct[] = []
    const removed_products: OpportunityProduct[] = []
    const updated_products: OpportunityProduct[] = []
    
    // Find added products (in current but not in original)
    products.forEach(product => {
      // Check if this is a new product (no product_id) or if it's not in original products
      if (!product.product_id || !originalProducts.find(op => op.product_id === product.product_id)) {
        added_products.push(product)
      }
    })
    
    // Find removed products (in original but not in current)
    originalProducts.forEach(originalProduct => {
      if (originalProduct.product_id && !products.find(p => p.product_id === originalProduct.product_id)) {
        removed_products.push(originalProduct)
      }
    })
    
    // Find updated products (in both but with different values)
    products.forEach(product => {
      if (product.product_id) {
        const originalProduct = originalProducts.find(op => op.product_id === product.product_id)
        if (originalProduct) {
          const hasChanges = 
            product.product_name !== originalProduct.product_name ||
            product.price_per_unit !== originalProduct.price_per_unit ||
            product.quantity !== originalProduct.quantity ||
            product.list_price !== originalProduct.list_price ||
            product.extended_amount !== originalProduct.extended_amount ||
            product.product_type !== originalProduct.product_type
          
          if (hasChanges) {
            updated_products.push(product)
          }
        }
      }
    })
    
    const products_changed = added_products.length > 0 || removed_products.length > 0 || updated_products.length > 0
    
    return {
      products_changed,
      added_products,
      removed_products,
      updated_products
    }
  }

  // Function to check if a field has changed
  const isFieldChanged = (fieldName: string): boolean => {
    if (!originalFormData) return false
    const currentValue = formData[fieldName as keyof typeof formData]
    const originalValue = originalFormData[fieldName]
    return String(currentValue || '') !== String(originalValue || '')
  }

  // Function to get change indicator style
  const getChangeIndicatorStyle = (fieldName: string) => {
    return isFieldChanged(fieldName) ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
  }

  useEffect(() => {
    async function loadData() {
      try {
        console.log("Loading data for opportunity edit form...")
        
        // Load the existing opportunity data
        const opportunity = await opportunityService.getById(opportunityId)
        if (!opportunity) {
          throw new Error('Opportunity not found')
        }
        
        // Load leads
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select('id, first_name, last_name, email, phone_number, owner')
          .order('first_name')
        
        if (leadsError) {
          console.error("Error loading leads:", leadsError)
        } else {
          console.log("Leads loaded:", leadsData?.length || 0, "leads")
          const typedLeads = leadsData?.map((item) => ({
            id: String(item.id),
            first_name: String(item.first_name || ''),
            last_name: String(item.last_name || ''),
            email: String(item.email || ''),
            phone_number: String(item.phone_number || ''),
            owner: String(item.owner || '')
          })) || []
          setLeads(typedLeads)
        }

        // Load advisors (users with role 'advisor')
        const { data: advisorsData, error: advisorsError } = await supabase
          .from('users')
          .select('id, fullName, email')
          .eq('role', 'advisor')
        
        if (advisorsError) {
          console.error("Error loading advisors:", advisorsError)
        } else {
          console.log("Advisors loaded:", advisorsData?.length || 0, "advisors")
          const typedAdvisors = advisorsData?.map((item) => ({
            id: String(item.id),
            fullName: String(item.fullName || ''),
            email: String(item.email || '')
          })) || []
          setAdvisors(typedAdvisors)
        }

        // Load supervisors (all users)
        const { data: supervisorsData, error: supervisorsError } = await supabase
          .from('users')
          .select('id, fullName, email')
        
        if (supervisorsError) {
          console.error("Error loading supervisors:", supervisorsError)
        } else {
          console.log("Supervisors loaded:", supervisorsData?.length || 0, "supervisors")
          const typedSupervisors = supervisorsData?.map((item) => ({
            id: String(item.id),
            fullName: String(item.fullName || ''),
            email: String(item.email || '')
          })) || []
          setSupervisors(typedSupervisors)
        }

        // Load available products from the products table
        const { data: productsData, error: availableProductsError } = await supabase
          .from('products')
          .select('id, name, list_price, currency, product_type, price_list')
          .order('name')
        
        if (availableProductsError) {
          console.error("Error loading products:", availableProductsError)
        } else {
          console.log("Products loaded:", productsData?.length || 0, "products")
          const typedProducts = productsData?.map((item) => ({
            id: String(item.id),
            name: String(item.name || ''),
            list_price: Number(item.list_price || 0),
            currency: String(item.currency || 'GBP'),
            product_type: String(item.product_type || ''),
            price_list: String(item.price_list || '')
          })) || []
          setAvailableProducts(typedProducts)
          setFilteredProducts(typedProducts) // Initially show all products
        }

        // Load factfinds
        const { data: factfindsData, error: factfindsError } = await supabase
          .from('factfinds')
          .select('id, name, factfind_date, contact_id')
          .order('factfind_date', { ascending: false })
        
        if (factfindsError) {
          console.error("Error loading factfinds:", factfindsError)
        } else {
          console.log("Factfinds loaded:", factfindsData?.length || 0, "factfinds")
          const typedFactfinds = factfindsData?.map((item) => ({
            id: String(item.id),
            name: String(item.name || ''),
            factfind_date: item.factfind_date,
            contact_id: String(item.contact_id || '')
          })) || []
          setFactfinds(typedFactfinds)
          console.log("Available factfinds:", typedFactfinds)
        }

        // Load illustrations
        const { data: illustrationsData, error: illustrationsError } = await supabase
          .from('illustrations')
          .select('id, name')
          .order('name')
        
        if (illustrationsError) {
          console.error("Error loading illustrations:", illustrationsError)
        } else {
          console.log("Illustrations loaded:", illustrationsData?.length || 0, "illustrations")
          const typedIllustrations = illustrationsData?.map((item) => ({
            id: String(item.id),
            name: String(item.name || '')
          })) || []
          setIllustrations(typedIllustrations)
          console.log("Available illustrations:", typedIllustrations)
        }

        // Load existing opportunity products with product details
        const { data: opportunityProductsData, error: opportunityProductsError } = await supabase
          .from('opportunity_products')
          .select(`
            id, 
            quantity, 
            price, 
            product_id,
            products(name, list_price, product_type)
          `)
          .eq('opportunity_id', opportunityId)
        
        if (opportunityProductsError) {
          console.error("Error loading opportunity products:", opportunityProductsError)
          setProducts([])
          setOriginalProducts([])
        } else {
          console.log("Opportunity products loaded:", opportunityProductsData?.length || 0, "products")
          
          // Convert opportunity products to the format expected by the form
          const formattedProducts: OpportunityProduct[] = opportunityProductsData?.map((op: any) => ({
            id: op.id, // This is opportunity_products.id (for tracking in the form)
            product_id: op.product_id, // This is the actual products.id
            product_type: 'existing' as const,
            product_name: op.products?.name || '',
            price_per_unit: op.price || 0,
            list_price: op.products?.list_price || 0,
            quantity: op.quantity || 1,
            extended_amount: (op.price || 0) * (op.quantity || 1)
          })) || []
          
          setProducts(formattedProducts)
          setOriginalProducts(formattedProducts)
        }

        // Set the selected lead based on opportunity data
        if (opportunity.lead?.id) {
          const lead = leadsData?.find((l: any) => l.id === opportunity.lead!.id)
          if (lead) {
            setSelectedLead(lead)
            console.log("Selected lead:", lead)
          } else {
            console.warn("Lead not found for ID:", opportunity.lead!.id)
          }
        } else {
          console.log("No lead in opportunity data")
        }

        // Prepare form data with existing opportunity data
        const preparedFormData = {
          contact_id: opportunity.lead?.id || "",
          opportunity_type: opportunity.type || "",
          topic: opportunity.topic || "",
          opportunity_topic: opportunity.opportunity_topic || "",
          potential_customer: opportunity.potential_customer || "",
          fact_find: opportunity.fact_find || "",
          fact_find_id: opportunity.fact_find || "",
          main_objectives: opportunity.main_objectives || "",
          advisor: opportunity.advisor?.toString() || "",
          supervised_by: opportunity.supervised_by || "",
          lead_source: opportunity.source || "",
          advisor_initial_analysis: opportunity.advisor_initial_analysis || "",
          benifits: opportunity.benifits || "",
          revenue_user_provided: opportunity.revenue_user_provided?.toString() || "",
          revenue_system_calculated: opportunity.revenue_system_calculated?.toString() || "",
          close_date: opportunity.expected_close_date || "",
          currency: opportunity.currency || "GBP",
          investment_manager: opportunity.investment_manager || "",
          rating: opportunity.rating || "",
          received595_pay: opportunity.received595_pay ? "true" : "",
          paid_owner: opportunity.paid_owner || "",
          paid_advisor: opportunity.paid_advisor || "",
          price_list: opportunity.price_list || "",
          illustration_id: "",
          name: opportunity.name || "",
          description: opportunity.description || "",
          stage: opportunity.stage || "Prospecting",
          probability: opportunity.probability?.toString() || "25",
          amount: opportunity.amount?.toString() || "",
          expected_close_date: opportunity.expected_close_date || "",
          owner: opportunity.owner || "",
          source: opportunity.source || "",
          type: opportunity.type || "",
          priority: opportunity.priority || "Medium",
          status: opportunity.status || "Open",
          notes: opportunity.notes || "",
        }

        // Set form data and store original data for change tracking
        console.log("Setting form data with opportunity:", opportunity)
        setFormData(preparedFormData)
        setOriginalFormData(preparedFormData)

      } catch (error) {
        console.error("Error loading data:", error)
        alert("Error loading opportunity data. Please try again.")
      }
    }

    loadData()
  }, [opportunityId])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Filter products when price list changes
    if (field === "price_list") {
      if (value) {
        const filtered = availableProducts.filter(product => product.price_list === value)
        setFilteredProducts(filtered)
      } else {
        setFilteredProducts(availableProducts) // Show all products if no price list selected
      }
    }
  }

  const addProduct = () => {
    const newProduct: OpportunityProduct = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      product_id: undefined, // Will be set when a product is selected
      product_type: 'existing',
      product_name: '',
      price_per_unit: 0,
      list_price: 0,
      quantity: 1,
      extended_amount: 0,
    }
    setProducts([...products, newProduct])
  }

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id))
  }

  const updateProduct = (id: string, field: keyof OpportunityProduct, value: any) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value }
        
        // If product name is selected, auto-populate price and set product_id
        if (field === 'product_name') {
          const selectedProduct = filteredProducts.find(prod => prod.name === value)
          if (selectedProduct) {
            updated.price_per_unit = selectedProduct.list_price
            updated.list_price = selectedProduct.list_price
            updated.product_id = parseInt(selectedProduct.id) // Set the actual products.id
          }
        }
        
        // Calculate extended amount
        if (field === 'price_per_unit' || field === 'quantity') {
          updated.extended_amount = updated.price_per_unit * updated.quantity
        }
        return updated
      }
      return p
    }))
  }

  const calculateTotalRevenue = () => {
    const productsTotal = products.reduce((sum, p) => sum + p.extended_amount, 0)
    const userProvided = parseFloat(formData.revenue_user_provided) || 0
    return Math.max(productsTotal, userProvided)
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Error accessing microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const deleteRecording = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("Starting opportunity update...")
      
      // Validate required fields
      const requiredFields = [
        'opportunity_type', 'topic', 'contact_id', 'main_objectives',
        'advisor', 'advisor_initial_analysis', 'close_date', 'currency'
      ]
      
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`)
        setLoading(false)
        return
      }

      // Detect changes in form data
      const changedFields = detectChanges()
      const productChanges = detectProductChanges()
      
      console.log("Detected changes:", { changedFields, productChanges })

      // If no changes detected, show message and return
      if (Object.keys(changedFields).length === 0 && !productChanges.products_changed && !audioBlob) {
        alert("No changes detected. The opportunity data remains the same.")
        setLoading(false)
        return
      }

      // Show summary of changes to user
      const changedFieldNames = Object.keys(changedFields)
      const changeSummary = []
      
      if (changedFieldNames.length > 0) {
        changeSummary.push(`Form fields: ${changedFieldNames.join(', ')}`)
      }
      
      if (productChanges.products_changed) {
        const productChangesList = []
        if (productChanges.added_products.length > 0) {
          const addedNames = productChanges.added_products
            .filter(p => p.product_name)
            .map(p => p.product_name)
            .join(', ')
          productChangesList.push(`${productChanges.added_products.length} added (${addedNames})`)
        }
        if (productChanges.removed_products.length > 0) {
          const removedNames = productChanges.removed_products
            .filter(p => p.product_name)
            .map(p => p.product_name)
            .join(', ')
          productChangesList.push(`${productChanges.removed_products.length} removed (${removedNames})`)
        }
        if (productChanges.updated_products.length > 0) {
          const updatedNames = productChanges.updated_products
            .filter(p => p.product_name)
            .map(p => p.product_name)
            .join(', ')
          productChangesList.push(`${productChanges.updated_products.length} updated (${updatedNames})`)
        }
        changeSummary.push(`Products: ${productChangesList.join('; ')}`)
      }
      
      if (audioBlob) {
        changeSummary.push('Voice memo added')
      }
      
      console.log("Change summary:", changeSummary.join('; '))

      const totalRevenue = calculateTotalRevenue()
      console.log("Total revenue calculated:", totalRevenue)
      
      // Prepare opportunity data (only the fields we insert into opportunities table)
      const opportunityData = {
        contact_id: null, // Keep contact_id as null
        lead_id: formData.contact_id, // Use the selected lead ID for lead_id
        name: selectedLead ? `${selectedLead.first_name} ${selectedLead.last_name}` : (formData.topic || formData.name),
        description: formData.description,
        stage: formData.stage,
        probability: Number.parseInt(formData.probability),
        amount: totalRevenue,
        expected_close_date: formData.close_date || formData.expected_close_date || undefined,
        owner: formData.owner,
        source: formData.lead_source || formData.source,
        type: formData.opportunity_type || formData.type,
        priority: formData.priority,
        status: formData.status,
        notes: formData.notes,
        
        // Fields that match your schema
        topic: formData.topic,
        fact_find: formData.fact_find,
        fact_find_id: formData.fact_find_id || null,
        main_objectives: formData.main_objectives,
        potential_customer: formData.potential_customer,
        advisor: formData.advisor ? parseInt(formData.advisor) : null, // Convert to bigint
        supervised_by: formData.supervised_by,
        advisor_initial_analysis: formData.advisor_initial_analysis,
        benifits: formData.benifits,
        revenue: formData.revenue_user_provided,
        est_revenue: totalRevenue, // Note: your schema has "est.revenue"
        est_closed_date: formData.close_date,
        currency: formData.currency,
        investment_manager: formData.investment_manager,
        rating: formData.rating,
        paid_owner: formData.paid_owner ? new Date(formData.paid_owner) : null, // Convert to date
        paid_advisor: formData.paid_advisor ? new Date(formData.paid_advisor) : null, // Convert to date
        received595_pay: formData.received595_pay ? new Date(formData.received595_pay) : null, // Convert to date
        price_list: formData.price_list,
        illustration_id: formData.illustration_id || null,
      }

      // Create a filtered opportunity data object with only changed fields
      const changedOpportunityData: any = {}
      Object.keys(changedFields).forEach(field => {
        // Map form field names to opportunity data field names
        const fieldMapping: { [key: string]: string } = {
          'lead_id': 'lead_id',
          'opportunity_type': 'type',
          'lead_source': 'source',
          'advisor_initial_analysis': 'advisor_initial_analysis',
          'benifits': 'benifits',
          'revenue_user_provided': 'revenue',
          'close_date': 'expected_close_date',
          'expected_close_date': 'expected_close_date',
          'illustration_id': 'illustration_id'
        }
        
        const mappedField = fieldMapping[field] || field
        changedOpportunityData[mappedField] = opportunityData[mappedField as keyof typeof opportunityData]
      })

      // Add calculated fields that might have changed
      if (changedFields.revenue_user_provided || productChanges.products_changed) {
        changedOpportunityData.amount = totalRevenue
        changedOpportunityData.est_revenue = totalRevenue
      }

      console.log("Sending changed opportunity data to webhook:", changedOpportunityData)

      // Prepare opportunity products data (without opportunity_id)
      const opportunityProductsData = products.map(product => {
        return {
          product_id: product.product_id, // Use the actual products.id that was set when product was selected
          quantity: product.quantity,
          price: product.price_per_unit
        }
      }).filter(item => item.product_id !== null) // Only include if product_id is found

      // Create FormData for the webhook
      const formDataToSend = new FormData()
      
      // Add the update type
      formDataToSend.append('update', 'opportunity')
      
      // Add the opportunity ID for update
      formDataToSend.append('opportunity_id', opportunityId)
      
      // Add change tracking information
      formDataToSend.append('changed_fields', JSON.stringify(changedFields))
      formDataToSend.append('product_changes', JSON.stringify(productChanges))
      formDataToSend.append('change_summary', changeSummary.join('; '))
      
      // Add the opportunity data (only changed fields)
      formDataToSend.append('opportunity_data', JSON.stringify(changedOpportunityData))
      
      // Add opportunity products data (only if products changed)
      if (productChanges.products_changed) {
        formDataToSend.append('opportunity_products', JSON.stringify(opportunityProductsData))
      }
      
      // Add voice recording if available
      if (audioBlob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const randomString = Math.random().toString(36).substring(2, 15)
        const fileName = `voice_memo_${timestamp}_${randomString}.wav`
        formDataToSend.append('voice_memo', audioBlob, fileName)
      }

      // Send opportunity data and voice recording to the webhook
      const response = await fetch(`${process.env.NEXT_PUBLIC_WEBHOOK_UPDATE_URL}`, {
        method: 'POST',
        body: formDataToSend
      })

      if (!response.ok) {
        console.error("Webhook call failed:", response.status, response.statusText)
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Webhook response:", result)

      // Redirect based on webhook response
      if (result.opportunity_id) {
        console.log("Opportunity updated successfully via webhook:", result.opportunity_id)
        window.location.href = `/opportunities/${result.opportunity_id}`
      } else {
        console.log("Webhook processed successfully, redirecting to opportunities list")
        window.location.href = "/opportunities"
      }

    } catch (error) {
      console.error("Error updating opportunity:", error)
      alert("Error updating opportunity. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/opportunities/${opportunityId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Opportunity
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Opportunity</h1>
            <p className="text-gray-600 mt-2">
              {selectedLead
                ? `Editing opportunity for ${selectedLead.first_name} ${selectedLead.last_name}`
                : "Update the opportunity details"}
            </p>
          </div>
        </div>

        {/* Change Summary Banner */}
        {originalFormData && (() => {
          const changedFields = detectChanges()
          const productChanges = detectProductChanges()
          const hasChanges = Object.keys(changedFields).length > 0 || productChanges.products_changed || audioBlob
          
          if (hasChanges) {
            return (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-blue-900">Changes Detected</span>
                </div>
                <div className="text-sm text-blue-700">
                  {Object.keys(changedFields).length > 0 && (
                    <div>Modified fields: {Object.keys(changedFields).join(', ')}</div>
                  )}
                  {productChanges.products_changed && (
                    <div>
                      Products: 
                      {productChanges.added_products.length > 0 && (
                        <span> {productChanges.added_products.length} added ({productChanges.added_products.filter(p => p.product_name).map(p => p.product_name).join(', ')})</span>
                      )}
                      {productChanges.removed_products.length > 0 && (
                        <span> {productChanges.removed_products.length} removed ({productChanges.removed_products.filter(p => p.product_name).map(p => p.product_name).join(', ')})</span>
                      )}
                      {productChanges.updated_products.length > 0 && (
                        <span> {productChanges.updated_products.length} updated ({productChanges.updated_products.filter(p => p.product_name).map(p => p.product_name).join(', ')})</span>
                      )}
                    </div>
                  )}
                  {audioBlob && <div>Voice memo added</div>}
                </div>
              </div>
            )
          }
          return null
        })()}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* General Information Tab */}
          <Card className={getChangeIndicatorStyle('topic')}>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Essential opportunity details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_id">Potential Customer *</Label>
                                     <div className="mt-1">
                     {selectedLead ? (
                       <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                         <div>
                           <div className="font-medium">
                             {selectedLead.first_name} {selectedLead.last_name}
                           </div>
                           <div className="text-sm text-gray-500">{selectedLead.email}</div>
                         </div>
                         <div className="text-sm text-gray-400">(Read-only)</div>
                       </div>
                     ) : (
                       <div className="p-3 border rounded-md bg-gray-50 text-gray-500">
                         No lead assigned
                       </div>
                     )}
                   </div>
                  {selectedLead && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Phone: {selectedLead.phone_number || "N/A"}</p>
                      <p>Owner: {selectedLead.owner || "N/A"}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="opportunity_type">Type of Opportunity *</Label>
                  <Select
                    value={formData.opportunity_type}
                    onValueChange={(value) => handleInputChange("opportunity_type", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select opportunity type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Legal">Legal</SelectItem>
                      <SelectItem value="Financial Services">Financial Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="topic">Topic *</Label>
                  <Input
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => handleInputChange("topic", e.target.value)}
                    placeholder="e.g., Retirement Planning Package"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="opportunity_topic">Opportunity Topic</Label>
                  <Input
                    id="opportunity_topic"
                    value={formData.opportunity_topic}
                    onChange={(e) => handleInputChange("opportunity_topic", e.target.value)}
                    placeholder="Additional topic details..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fact_find_id">Fact Find</Label>
                <Select
                  value={formData.fact_find_id}
                  onValueChange={(value) => handleInputChange("fact_find_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fact find..." />
                  </SelectTrigger>
                  <SelectContent>
                    {factfinds.map((factfind) => (
                      <SelectItem key={factfind.id} value={factfind.id}>
                        {factfind.name} - {factfind.factfind_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="main_objectives">Main Objectives *</Label>
                <Textarea
                  id="main_objectives"
                  value={formData.main_objectives}
                  onChange={(e) => handleInputChange("main_objectives", e.target.value)}
                  placeholder="Primary objectives for this opportunity..."
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Advisor Information Card */}
          <Card className={getChangeIndicatorStyle('advisor')}>
            <CardHeader>
              <CardTitle>Advisor Information</CardTitle>
              <CardDescription>Assignment and management details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="advisor">Advisor *</Label>
                  <Select
                    value={formData.advisor}
                    onValueChange={(value) => handleInputChange("advisor", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select advisor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {advisors.map((advisor) => (
                        <SelectItem key={advisor.id} value={advisor.id}>
                          {advisor.fullName} - {advisor.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supervised_by">Supervised by</Label>
                  <Select
                    value={formData.supervised_by}
                    onValueChange={(value) => handleInputChange("supervised_by", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.fullName} - {supervisor.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <Select
                    value={formData.lead_source}
                    onValueChange={(value) => handleInputChange("lead_source", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="typeform">Typeform</SelectItem>
                      <SelectItem value="dynamics">Dynamics</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="advisor_initial_analysis">Adviser Initial Analysis *</Label>
                <Textarea
                  id="advisor_initial_analysis"
                  value={formData.advisor_initial_analysis}
                  onChange={(e) => handleInputChange("advisor_initial_analysis", e.target.value)}
                  placeholder="Initial analysis and assessment..."
                  rows={4}
                  required
                />
              </div>

                             <div>
                 <Label htmlFor="benifits">Benefits</Label>
                 <Textarea
                   id="benifits"
                   value={formData.benifits}
                   onChange={(e) => handleInputChange("benifits", e.target.value)}
                   placeholder="Benefits and value proposition..."
                   rows={3}
                 />
               </div>
            </CardContent>
          </Card>

          {/* Forecast Information Card */}
          <Card className={getChangeIndicatorStyle('revenue_user_provided')}>
            <CardHeader>
              <CardTitle>Forecast Information</CardTitle>
              <CardDescription>Financial projections and revenue details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="revenue_user_provided">Revenue (User Provided)</Label>
                  <Input
                    id="revenue_user_provided"
                    type="number"
                    value={formData.revenue_user_provided}
                    onChange={(e) => handleInputChange("revenue_user_provided", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="revenue_system_calculated">Revenue (System Calculated)</Label>
                  <Input
                    id="revenue_system_calculated"
                    type="number"
                    value={calculateTotalRevenue().toFixed(2)}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="close_date">Close Date *</Label>
                  <Input
                    id="close_date"
                    type="date"
                    value={formData.close_date}
                    onChange={(e) => handleInputChange("close_date", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleInputChange("currency", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="investment_manager">Investment Manager</Label>
                  <Select
                    value={formData.investment_manager}
                    onValueChange={(value) => handleInputChange("investment_manager", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.fullName} - {manager.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <Select
                    value={formData.rating}
                    onValueChange={(value) => handleInputChange("rating", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A (Excellent)</SelectItem>
                      <SelectItem value="B">B (Good)</SelectItem>
                      <SelectItem value="C">C (Average)</SelectItem>
                      <SelectItem value="D">D (Below Average)</SelectItem>
                      <SelectItem value="E">E (Poor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="received595_pay">Received £ 595 Pay</Label>
                  <Input
                    id="received595_pay"
                    type="date"
                    value={formData.received595_pay}
                    onChange={(e) => handleInputChange("received595_pay", e.target.value)}
                    placeholder="Select date..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paid_owner">Paid Owner</Label>
                  <Input
                    id="paid_owner"
                    value={formData.paid_owner}
                    onChange={(e) => handleInputChange("paid_owner", e.target.value)}
                    placeholder="Owner payment details..."
                  />
                </div>
                <div>
                  <Label htmlFor="paid_advisor">Paid Advisor</Label>
                  <Input
                    id="paid_advisor"
                    value={formData.paid_advisor}
                    onChange={(e) => handleInputChange("paid_advisor", e.target.value)}
                    placeholder="Advisor payment details..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Card */}
          <Card className={(() => {
            const productChanges = detectProductChanges()
            return productChanges.products_changed ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
          })()}>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Product details and pricing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="price_list">Price List</Label>
                <Select
                  value={formData.price_list}
                  onValueChange={(value) => handleInputChange("price_list", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select price list..." />
                  </SelectTrigger>
                                     <SelectContent>
                     <SelectItem value="Financial">Financial Price List</SelectItem>
                     <SelectItem value="Standard">Standard Price List</SelectItem>
                     <SelectItem value="Legal">Legal Price List</SelectItem>
                   </SelectContent>
                </Select>
                                 {formData.price_list && (
                   <p className="text-sm text-muted-foreground mt-1">
                     Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} for {formData.price_list} Price List
                   </p>
                 )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Opportunity Products</Label>
                  <Button type="button" onClick={addProduct} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No products added yet. Click "Add Product" to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product, index) => (
                      <Card key={product.id} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={product.product_type}
                              onValueChange={(value) => updateProduct(product.id, 'product_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="existing">Existing Product</SelectItem>
                                <SelectItem value="writein">Write-in Product</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2">
                            <Label>Product Name</Label>
                            <Select
                              value={product.product_name}
                              onValueChange={(value) => updateProduct(product.id, 'product_name', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product..." />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredProducts.length > 0 ? (
                                  filteredProducts.map((prod) => (
                                    <SelectItem key={prod.id} value={prod.name}>
                                      {prod.name} - £{prod.list_price}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="" disabled>
                                    No products available for selected price list
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Price per Unit</Label>
                            <Input
                              type="number"
                              value={product.price_per_unit}
                              onChange={(e) => updateProduct(product.id, 'price_per_unit', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder="1"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              onClick={() => removeProduct(product.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label>List Price</Label>
                            <Input
                              type="number"
                              value={product.list_price}
                              onChange={(e) => updateProduct(product.id, 'list_price', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Extended Amount</Label>
                            <Input
                              type="number"
                              value={product.extended_amount.toFixed(2)}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {products.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold">
                      Total Products Value: £{products.reduce((sum, p) => sum + p.extended_amount, 0).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Illustrations Card */}
          <Card className={getChangeIndicatorStyle('illustration_id')}>
            <CardHeader>
              <CardTitle>Illustrations</CardTitle>
              <CardDescription>Select an illustration for this opportunity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="illustration_id">Illustration</Label>
                <Select
                  value={formData.illustration_id}
                  onValueChange={(value) => handleInputChange("illustration_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an illustration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {illustrations.map((illustration) => (
                      <SelectItem key={illustration.id} value={illustration.id}>
                        {illustration.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className={audioBlob ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''}>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Add voice memos and additional notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-lg font-semibold mb-4 block">Voice Memos</Label>
                <div className="flex items-center gap-4">
                  {!isRecording && !audioUrl && (
                    <Button
                      type="button"
                      onClick={startRecording}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      Start Recording
                    </Button>
                  )}
                  
                  {isRecording && (
                    <Button
                      type="button"
                      onClick={stopRecording}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                      Stop Recording
                    </Button>
                  )}
                  
                  {audioUrl && (
                    <>
                      <audio controls className="flex-1">
                        <source src={audioUrl} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        type="button"
                        onClick={deleteRecording}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
                
                {!audioUrl && !isRecording && (
                  <p className="text-sm text-gray-500 mt-2">
                    Click "Start Recording" to record a voice memo for this opportunity.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              size="lg" 
              onClick={() => window.location.href = `/opportunities/${opportunityId}`}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={loading} className="px-8">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Opportunity
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
