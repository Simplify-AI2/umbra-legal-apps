import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Table, Badge, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Import mammoth for .docx files
import mammoth from 'mammoth';

// Set worker source
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Contract Review Agent - TRIAL - v2
//const SIMPLIFY_API_URL = 'https://workflow.simplifygenai.id/api/v1/prediction/e247eb0a-1035-400a-bcd2-38805ac78b5f';

// Contract Review Agent - TRIAL - v3
const SIMPLIFY_API_URL = 'https://workflow.simplifygenai.id/api/v1/prediction/f6b84cfa-342d-43f1-b858-23ceacb80865';


const ContractReview = () => {
  // NEW: Function to force add checkboxes to tables A, B, and C with new logic
  const forceAddCheckboxesNew = () => {
    const container = aiReviewRef.current;
    if (!container) {
      console.log('Container not found');
      return false;
    }

    const allTables = container.querySelectorAll('table');
    let checkboxesAdded = false;

    allTables.forEach((table, tableIndex) => {
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      const headerTexts = Array.from(headerRow?.children || []).map(cell => cell.textContent.trim());
      const headerString = headerTexts.join(' ').toLowerCase();

      // Table A: Compliance Assessment and Legal Justification (no checkboxes)
      if (headerString.includes('compliance assessment and legal justification')) {
        // Do nothing
        return;
      }

      // Table B: Recommended Legal Amendments and Clause Revisions
      if (headerString.includes('recommended legal amendments and clause revisions')) {
        // Ensure Select header exists
        if (headerRow && !headerTexts.some(text => text.toLowerCase().includes('select'))) {
          const selectHeader = document.createElement('th');
          selectHeader.textContent = 'Select';
          headerRow.appendChild(selectHeader);
        }
        // Add checkboxes to rows (skip header)
        const rows = table.querySelectorAll('tbody tr, tr');
        rows.forEach((row, rowIdx) => {
          if (row.parentElement.tagName === 'THEAD') return;
          // Only add if not already present
          if (!row.querySelector('.table-b-checkbox')) {
            const td = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'table-b-checkbox';
            checkbox.id = `tableB_checkbox_${tableIndex}_${rowIdx}`;
            checkbox.onchange = (e) => {
              // When checked, add readonly textarea to the row
              let textarea = row.querySelector('.table-b-textarea');
              if (e.target.checked && !textarea) {
                textarea = document.createElement('textarea');
                textarea.className = 'table-b-textarea';
                textarea.readOnly = true;
                textarea.style.width = '100%';
                textarea.style.minHeight = '60px';
                textarea.style.margin = '4px 0';
                textarea.value = '';
                row.appendChild(textarea);
              } else if (!e.target.checked && textarea) {
                textarea.remove();
              }
            };
            td.appendChild(checkbox);
            row.appendChild(td);
            checkboxesAdded = true;
          }
        });
        return;
      }

      // Table C: Redundancy Check (header OR previous sibling contains 'Redundancy Check')
      let isTableC = headerString.includes('redundancy check');
      if (!isTableC) {
        // Check previous sibling (element or text node)
        let prev = table.previousSibling;
        while (prev && prev.nodeType !== 1 && prev.nodeType !== 3) prev = prev.previousSibling;
        if (prev) {
          let prevText = '';
          if (prev.nodeType === 3) {
            prevText = prev.textContent || prev.nodeValue || '';
          } else if (prev.nodeType === 1) {
            prevText = prev.textContent || '';
          }
          if (prevText.toLowerCase().includes('redundancy check')) {
            isTableC = true;
          }
        }
      }
      if (isTableC) {
        // Ensure Select header exists
        if (headerRow && !headerTexts.some(text => text.toLowerCase().includes('select'))) {
          const selectHeader = document.createElement('th');
          selectHeader.textContent = 'Select';
          headerRow.appendChild(selectHeader);
        }
        // Add checkboxes to rows (skip header)
        const rows = table.querySelectorAll('tbody tr, tr');
        rows.forEach((row, rowIdx) => {
          if (row.parentElement.tagName === 'THEAD') return;
          // Only add if not already present
          if (!row.querySelector('.table-c-checkbox')) {
            const td = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'table-c-checkbox';
            checkbox.id = `tableC_redundancy_checkbox_${tableIndex}_${rowIdx}`;
            td.appendChild(checkbox);
            row.appendChild(td);
            checkboxesAdded = true;
          }
        });
        return;
      }
    });
    return checkboxesAdded;
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [underlyingAgreementFiles, setUnderlyingAgreementFiles] = useState([]);
  const [reviewLanguage, setReviewLanguage] = useState('English');
  const [partyPositioning, setPartyPositioning] = useState('');
  const [riskPositioning, setRiskPositioning] = useState('Unilateral');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [aiReviewContent, setAiReviewContent] = useState(null);
  const [apiRawResponse, setApiRawResponse] = useState(null);
  const aiReviewRef = useRef(null);
  const [originalPdfText, setOriginalPdfText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationModalValue, setVerificationModalValue] = useState('');
  const [verificationModalCell, setVerificationModalCell] = useState(null);
  const [revisedContract, setRevisedContract] = useState('');
  const [isGeneratingRevised, setIsGeneratingRevised] = useState(false);
  const [editableRevisedContract, setEditableRevisedContract] = useState('');

  // Function to generate unique contract_review_id using uuid v4
  const generateContractReviewId = () => uuidv4();

  // Handler for underlying agreement file input (multiple files, up to 10)
  const handleUnderlyingAgreementFileChange = (event) => {
    let newFiles = Array.from(event.target.files);
    // Prevent duplicates by name and size
    const existingNames = new Set(underlyingAgreementFiles.map(f => f.name + f.size));
    newFiles = newFiles.filter(f => !existingNames.has(f.name + f.size));
    const combined = [...underlyingAgreementFiles, ...newFiles].slice(0, 10);
    setUnderlyingAgreementFiles(combined);
  };

  // Handler to remove a file from the list
  const handleRemoveUnderlyingAgreementFile = (index) => {
    setUnderlyingAgreementFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Extract text from PDF file
  const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text.trim();
  };

  // Extract text from DOCX file
  const extractDocxText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value.trim();
  };

  // Main handler for Conduct Review
  const onConductReview = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      alert('Please select an agreement file to review.');
      return;
    }
    setIsProcessing(true);
    try {
      // Generate uniqueID
      const uniqueID = uuidv4();

      // Extract text from Upload Agreement
      let agreementFile = '';
      if (selectedFile.type === 'application/pdf') {
        agreementFile = await extractPdfText(selectedFile);
      } else if (
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        selectedFile.name.toLowerCase().endsWith('.docx')
      ) {
        agreementFile = await extractDocxText(selectedFile);
      } else {
        alert('Agreement file must be PDF or DOCX.');
        setIsProcessing(false);
        return;
      }

      // Get user's selections
      const languageReviewMode = reviewLanguage;
      const partyPosition = partyPositioning;
      const riskPosition = riskPositioning;

      // Extract text from each Underlying Agreement file
      let underlyingAgreements = '';
      if (underlyingAgreementFiles.length > 0) {
        const uaTexts = [];
        for (let i = 0; i < underlyingAgreementFiles.length; i++) {
          const file = underlyingAgreementFiles[i];
          let text = '';
          if (file.type === 'application/pdf') {
            text = await extractPdfText(file);
          } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.toLowerCase().endsWith('.docx')
          ) {
            text = await extractDocxText(file);
          } else {
            text = '[Unsupported file type: ' + file.name + ']';
          }
          uaTexts.push(`Underlying Agreement #${i+1} (${file.name}):\n${text}`);
        }
        underlyingAgreements = uaTexts.join('\n\n');
      } else {
        underlyingAgreements = '[No underlying agreements uploaded]';
      }

      // Compose prompt
      const prompt = `Here is the text from the uploaded Agreement to be reviewed: ${agreementFile}.
Please conduct a legal review and analysis of this Agreement based on the uploaded Underlying Agreement files: ${underlyingAgreements},
taking into account the user's Party Positioning: ${partyPosition}, and Risk Positioning: ${riskPosition}.`;

      // Log the prompt string
      console.log('--- Conduct Review Prompt ---');
      console.log(prompt);
      console.log('uniqueID (for chatId and contract_review_id):', uniqueID);
      console.log('Selected Language Review Mode:', languageReviewMode);

      // Call the AI review API
      setAiReviewContent('<em>Processing AI review...</em>');
      try {
        const response = await fetch(SIMPLIFY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: prompt,
            chatId: uniqueID,
            uploads: []
          })
        });
        if (!response.ok) {
          throw new Error(`AI Review API error: ${response.status}`);
        }
        const result = await response.json();
        let aiText = result.text || result.output || '[No response from AI Review Agent]';
        setAiReviewContent(aiText);
        setApiRawResponse(result);
      } catch (apiErr) {
        setAiReviewContent('[Error from AI Review Agent: ' + apiErr.message + ']');
        console.error(apiErr);
      }
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
      alert('Error during review: ' + err.message);
      console.error(err);
    }
  };


  // Handler for review language selection
  const handleReviewLanguageChange = (event) => {
    setReviewLanguage(event.target.value);
  };

  // Handler for party positioning input
  const handlePartyPositioningChange = (event) => {
    setPartyPositioning(event.target.value);
  };

  // Handler for risk positioning select
  const handleRiskPositioningChange = (event) => {
    setRiskPositioning(event.target.value);
  };

  // Test function to manually trigger checkbox creation (for debugging)
  const testCheckboxCreation = () => {
    console.log('=== TESTING CHECKBOX CREATION ===');
    if (!aiReviewRef.current) {
      console.log('aiReviewRef.current is null');
      return;
    }

    const tables = aiReviewRef.current.querySelectorAll('table');
    console.log(`Found ${tables.length} tables`);
    
    tables.forEach((table, index) => {
      console.log(`Table ${index + 1}:`, table.textContent.substring(0, 200));
      const checkboxes = table.querySelectorAll('input[type="checkbox"]');
      console.log(`Table ${index + 1} has ${checkboxes.length} checkboxes`);
    });
    
    // Try to force add checkboxes
    const success = forceAddCheckboxesNew();
    console.log('Checkbox creation result:', success);
  };
      
      // Function to force add checkboxes to ANY table that might be amendments
      const forceAddCheckboxes = () => {
        const container = aiReviewRef.current;
        if (!container) {
          console.log('Container not found');
          return false;
        }

        console.log('Searching for tables in container...');
        const allTables = container.querySelectorAll('table');
        console.log(`Found ${allTables.length} tables total`);

        let checkboxesAdded = false;

        allTables.forEach((table, tableIndex) => {
          console.log(`Checking table ${tableIndex + 1}:`, table.textContent.substring(0, 100));
          
          // Check if this table is specifically table B) "Recommended Legal Amendments and Clause Revisions"
          const tableText = table.textContent.toLowerCase();
          
          // More flexible detection for table B) - look for various ways the AI might format it
          const isTableB = (
            // Look for table B) with various title formats
            (tableText.includes('b)') || tableText.includes('table b') || tableText.includes('table b)')) &&
            // And look for amendments/revisions content
            (tableText.includes('amendment') || tableText.includes('revision') || tableText.includes('clause'))
          ) ||
          // Alternative: look for the full title in various formats
          tableText.includes('recommended legal amendments and clause revisions') ||
          tableText.includes('recommended amendments and clause revisions') ||
          tableText.includes('legal amendments and revisions');
          
          console.log(`Table ${tableIndex + 1} text preview:`, tableText.substring(0, 200));
          console.log(`Table ${tableIndex + 1} contains 'b)':`, tableText.includes('b)'));
          console.log(`Table ${tableIndex + 1} contains amendment/revision:`, tableText.includes('amendment') || tableText.includes('revision'));
          
          if (isTableB) {
            console.log(`Table ${tableIndex + 1} is confirmed as table B) - adding checkboxes...`);
            
            // Force add header if it doesn't exist
            let headerRow = table.querySelector('thead tr');
            if (!headerRow) {
              console.log('No thead found, creating one...');
              const thead = document.createElement('thead');
              headerRow = document.createElement('tr');
              thead.appendChild(headerRow);
              table.insertBefore(thead, table.firstChild);
            }
            
            // Add Select header
            const existingSelectHeader = headerRow.querySelector('th:last-child');
            if (!existingSelectHeader || !existingSelectHeader.textContent.includes('Select')) {
              const selectHeader = document.createElement('th');
              selectHeader.textContent = 'Select';
              selectHeader.style.textAlign = 'center';
              selectHeader.style.width = '80px';
              selectHeader.style.backgroundColor = '#f8f9fa';
              selectHeader.style.border = '1px solid #dee2e6';
              selectHeader.style.padding = '8px';
              headerRow.appendChild(selectHeader);
              console.log('Added Select header to table B)');
            }
            
            // Add checkboxes to all rows
            const allRows = table.querySelectorAll('tr');
            console.log(`Found ${allRows.length} total rows in table B)`);
            
            allRows.forEach((row, rowIndex) => {
              // Skip header row
              if (row.parentElement.tagName === 'THEAD') {
                return;
              }
              
              // Check if row already has checkbox
              const existingCheckbox = row.querySelector('input[type="checkbox"]');
              if (!existingCheckbox) {
                // Create new cell with checkbox
                const checkboxCell = document.createElement('td');
                checkboxCell.style.textAlign = 'center';
                checkboxCell.style.verticalAlign = 'middle';
                checkboxCell.style.border = '1px solid #dee2e6';
                checkboxCell.style.padding = '8px';
                checkboxCell.style.backgroundColor = '#ffffff';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.width = '18px';
                checkbox.style.height = '18px';
                checkbox.style.cursor = 'pointer';
                checkbox.id = `checkbox-tableB-row-${rowIndex}`;
                checkbox.onclick = (e) => {
                  console.log(`Checkbox clicked: ${checkbox.id}`);
              // Remove stopPropagation to allow the change event to fire properly
              // e.stopPropagation();
                };
                checkbox.onchange = (e) => {
                  const isChecked = e.target.checked;
                  console.log(`Checkbox ${checkbox.id} changed to: ${isChecked}`);
                  
                  // Find the "Input Verification of Amendments" column in this row
                  const cells = row.querySelectorAll('td');
                  let verificationCell = null;
                  
                  // First try to find by header text
                  const table = row.closest('table');
                  const headerRow = table.querySelector('thead tr');
                  if (headerRow) {
                    const headerCells = headerRow.querySelectorAll('th');
                    let verificationColumnIndex = -1;
                    
                    headerCells.forEach((headerCell, index) => {
                      const headerText = headerCell.textContent.toLowerCase();
                  console.log(`Checking header ${index}: "${headerCell.textContent}"`);
                      if (headerText.includes('input verification') || 
                          headerText.includes('verification of amendments') ||
                          headerText.includes('verification')) {
                        verificationColumnIndex = index;
                        console.log(`Found verification column at index ${index}: "${headerCell.textContent}"`);
                      }
                    });
                    
                    if (verificationColumnIndex >= 0 && cells[verificationColumnIndex]) {
                      verificationCell = cells[verificationColumnIndex];
                  console.log(`Using verification cell at index ${verificationColumnIndex}`);
                    }
                  }
                  
                  // Fallback: look for cell content
                  if (!verificationCell) {
                console.log('Trying fallback method to find verification cell...');
                cells.forEach((cell, cellIndex) => {
                  const cellText = cell.textContent.toLowerCase();
                  console.log(`Cell ${cellIndex} content: "${cell.textContent.substring(0, 50)}..."`);
                  if (cellText.includes('input verification') || 
                      cellText.includes('verification')) {
                        verificationCell = cell;
                    console.log(`Found verification cell by content at index ${cellIndex}`);
                      }
                    });
                  }
              
              // Additional fallback: try to find by position (usually the 4th column)
              if (!verificationCell && cells.length >= 4) {
                console.log('Trying position-based fallback (4th column)...');
                verificationCell = cells[3]; // 4th column (0-indexed)
                console.log(`Using 4th column as verification cell: "${verificationCell.textContent.substring(0, 50)}..."`);
              }
                  
                  if (verificationCell) {
                console.log(`Verification cell found: "${verificationCell.textContent.substring(0, 100)}..."`);
                    if (isChecked) {
                      // Find the "Revised Clause (Formal Legal Language)" column to get default text
                      let defaultText = '';
                      const headerRow = table.querySelector('thead tr');
                      if (headerRow) {
                        const headerCells = headerRow.querySelectorAll('th');
                        let revisedClauseColumnIndex = -1;
                        
                        headerCells.forEach((headerCell, index) => {
                          const headerText = headerCell.textContent.toLowerCase();
                          if (headerText.includes('revised clause') || 
                              headerText.includes('formal legal language') ||
                              headerText.includes('recommended amendment')) {
                            revisedClauseColumnIndex = index;
                            console.log(`Found revised clause column at index ${index}: "${headerCell.textContent}"`);
                          }
                        });
                        
                        if (revisedClauseColumnIndex >= 0 && cells[revisedClauseColumnIndex]) {
                          defaultText = cells[revisedClauseColumnIndex].textContent.trim();
                          console.log(`Default text from revised clause column: "${defaultText.substring(0, 100)}..."`);
                        }
                      }
                      
                      // Create textarea when checkbox is checked
                      const textarea = document.createElement('textarea');
                      textarea.placeholder = 'Enter verification notes...';
                      textarea.value = defaultText; // Set default text from revised clause column
                      textarea.style.width = '100%';
                      textarea.style.minHeight = '60px';
                      textarea.style.height = 'auto'; // Start with auto height
                      textarea.style.padding = '4px';
                      textarea.style.border = '1px solid #ccc';
                      textarea.style.borderRadius = '4px';
                      textarea.style.fontSize = '12px';
                      textarea.style.resize = 'vertical'; // Allow vertical resizing
                      textarea.style.overflowY = 'auto'; // Show scrollbar if needed
                      textarea.id = `textarea-${checkbox.id}`;
                      
                      // Auto-resize textarea to fit content
                      const autoResize = () => {
                        textarea.style.height = 'auto';
                        const scrollHeight = textarea.scrollHeight;
                        const maxHeight = Math.max(200, scrollHeight); // Minimum 200px, or content height
                        textarea.style.height = `${maxHeight}px`;
                      };
                      
                      // Set initial height after content is loaded
                      setTimeout(autoResize, 10);
                      
                      // Auto-resize on input
                      textarea.addEventListener('input', autoResize);
                      
                      // Clear existing content and add textarea
                      verificationCell.innerHTML = '';
                      verificationCell.appendChild(textarea);
                      textarea.focus();
                      
                      console.log(`Added textarea to verification cell for row ${rowIndex + 1} with default text`);
                    } else {
                      // Remove textarea when checkbox is unchecked
                      const existingTextarea = verificationCell.querySelector('textarea');
                      if (existingTextarea) {
                        verificationCell.innerHTML = '';
                        console.log(`Removed textarea from verification cell for row ${rowIndex + 1}`);
                      }
                    }
                  } else {
                    console.log(`Could not find verification cell in row ${rowIndex + 1}`);
                console.log('Available cells:', Array.from(cells).map((cell, idx) => `${idx}: "${cell.textContent.substring(0, 50)}..."`));
                  }
                };
                
                checkboxCell.appendChild(checkbox);
                row.appendChild(checkboxCell);
                checkboxesAdded = true;
                console.log(`Added checkbox to row ${rowIndex + 1} in table B)`);
              }
            });
          } else {
            console.log(`Table ${tableIndex + 1} is NOT table B) - skipping checkbox addition`);
            
            // Fallback: if we haven't found table B) yet and this table looks like it could be it
            if (!checkboxesAdded && tableIndex > 0) { // Skip first table (likely table A)
              const fallbackCheck = (tableText.includes('amendment') || 
                                   tableText.includes('revision') || 
                                   tableText.includes('clause') ||
                                   tableText.includes('recommended')) &&
                                   // Exclude table C) "Redundancy Check"
                                   !tableText.includes('redundancy') &&
                                   !tableText.includes('c)') &&
                                   !tableText.includes('table c');
              
              if (fallbackCheck) {
                console.log(`Fallback: Table ${tableIndex + 1} might be table B) - adding checkboxes anyway...`);
                
                // Force add header if it doesn't exist
                let headerRow = table.querySelector('thead tr');
                if (!headerRow) {
                  console.log('No thead found, creating one...');
                  const thead = document.createElement('thead');
                  headerRow = document.createElement('tr');
                  thead.appendChild(headerRow);
                  table.insertBefore(thead, table.firstChild);
                }
                
                // Add Select header
                const existingSelectHeader = headerRow.querySelector('th:last-child');
                if (!existingSelectHeader || !existingSelectHeader.textContent.includes('Select')) {
                  const selectHeader = document.createElement('th');
                  selectHeader.textContent = 'Select';
                  selectHeader.style.textAlign = 'center';
                  selectHeader.style.width = '80px';
                  selectHeader.style.backgroundColor = '#f8f9fa';
                  selectHeader.style.border = '1px solid #dee2e6';
                  selectHeader.style.padding = '8px';
                  headerRow.appendChild(selectHeader);
                  console.log('Added Select header to fallback table');
                }
                
                // Add checkboxes to all rows
                const allRows = table.querySelectorAll('tr');
                console.log(`Found ${allRows.length} total rows in fallback table`);
                
                allRows.forEach((row, rowIndex) => {
                  // Skip header row
                  if (row.parentElement.tagName === 'THEAD') {
                    return;
                  }
                  
                  // Check if row already has checkbox
                  const existingCheckbox = row.querySelector('input[type="checkbox"]');
                  if (!existingCheckbox) {
                    // Create new cell with checkbox
                    const checkboxCell = document.createElement('td');
                    checkboxCell.style.textAlign = 'center';
                    checkboxCell.style.verticalAlign = 'middle';
                    checkboxCell.style.border = '1px solid #dee2e6';
                    checkboxCell.style.padding = '8px';
                    checkboxCell.style.backgroundColor = '#ffffff';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.style.width = '18px';
                    checkbox.style.height = '18px';
                    checkbox.style.cursor = 'pointer';
                    checkbox.id = `checkbox-fallback-row-${rowIndex}`;
                    checkbox.onclick = (e) => {
                      console.log(`Checkbox clicked: ${checkbox.id}`);
                  // Remove stopPropagation to allow the change event to fire properly
                  // e.stopPropagation();
                    };
                    checkbox.onchange = (e) => {
                      const isChecked = e.target.checked;
                      console.log(`Fallback checkbox ${checkbox.id} changed to: ${isChecked}`);
                      
                      // Find the "Input Verification of Amendments" column in this row
                      const cells = row.querySelectorAll('td');
                      let verificationCell = null;
                      
                      // First try to find by header text
                      const table = row.closest('table');
                      const headerRow = table.querySelector('thead tr');
                      if (headerRow) {
                        const headerCells = headerRow.querySelectorAll('th');
                        let verificationColumnIndex = -1;
                        
                        headerCells.forEach((headerCell, index) => {
                          const headerText = headerCell.textContent.toLowerCase();
                      console.log(`Checking header ${index}: "${headerCell.textContent}"`);
                          if (headerText.includes('input verification') || 
                              headerText.includes('verification of amendments') ||
                              headerText.includes('verification')) {
                            verificationColumnIndex = index;
                            console.log(`Found verification column at index ${index}: "${headerCell.textContent}"`);
                          }
                        });
                        
                        if (verificationColumnIndex >= 0 && cells[verificationColumnIndex]) {
                          verificationCell = cells[verificationColumnIndex];
                      console.log(`Using verification cell at index ${verificationColumnIndex}`);
                        }
                      }
                      
                      // Fallback: look for cell content
                      if (!verificationCell) {
                    console.log('Trying fallback method to find verification cell...');
                    cells.forEach((cell, cellIndex) => {
                      const cellText = cell.textContent.toLowerCase();
                      console.log(`Cell ${cellIndex} content: "${cell.textContent.substring(0, 50)}..."`);
                      if (cellText.includes('input verification') || 
                          cellText.includes('verification')) {
                            verificationCell = cell;
                        console.log(`Found verification cell by content at index ${cellIndex}`);
                          }
                        });
                      }
                  
                  // Additional fallback: try to find by position (usually the 4th column)
                  if (!verificationCell && cells.length >= 4) {
                    console.log('Trying position-based fallback (4th column)...');
                    verificationCell = cells[3]; // 4th column (0-indexed)
                    console.log(`Using 4th column as verification cell: "${verificationCell.textContent.substring(0, 50)}..."`);
                  }
                      
                      if (verificationCell) {
                    console.log(`Verification cell found: "${verificationCell.textContent.substring(0, 100)}..."`);
                        if (isChecked) {
                          // Find the "Revised Clause (Formal Legal Language)" column to get default text
                          let defaultText = '';
                          const headerRow = table.querySelector('thead tr');
                          if (headerRow) {
                            const headerCells = headerRow.querySelectorAll('th');
                            let revisedClauseColumnIndex = -1;
                            
                            headerCells.forEach((headerCell, index) => {
                              const headerText = headerCell.textContent.toLowerCase();
                              if (headerText.includes('revised clause') || 
                                  headerText.includes('formal legal language') ||
                                  headerText.includes('recommended amendment')) {
                                revisedClauseColumnIndex = index;
                                console.log(`Found revised clause column at index ${index}: "${headerCell.textContent}"`);
                              }
                            });
                            
                            if (revisedClauseColumnIndex >= 0 && cells[revisedClauseColumnIndex]) {
                              defaultText = cells[revisedClauseColumnIndex].textContent.trim();
                              console.log(`Default text from revised clause column: "${defaultText.substring(0, 100)}..."`);
                            }
                          }
                          
                          // Create textarea when checkbox is checked
                          const textarea = document.createElement('textarea');
                          textarea.placeholder = 'Enter verification notes...';
                          textarea.value = defaultText; // Set default text from revised clause column
                          textarea.style.width = '100%';
                          textarea.style.minHeight = '60px';
                          textarea.style.height = 'auto'; // Start with auto height
                          textarea.style.padding = '4px';
                          textarea.style.border = '1px solid #ccc';
                          textarea.style.borderRadius = '4px';
                          textarea.style.fontSize = '12px';
                          textarea.style.resize = 'vertical'; // Allow vertical resizing
                          textarea.style.overflowY = 'auto'; // Show scrollbar if needed
                          textarea.id = `textarea-${checkbox.id}`;
                          
                          // Auto-resize textarea to fit content
                          const autoResize = () => {
                            textarea.style.height = 'auto';
                            const scrollHeight = textarea.scrollHeight;
                            const maxHeight = Math.max(200, scrollHeight); // Minimum 200px, or content height
                            textarea.style.height = `${maxHeight}px`;
                          };
                          
                          // Set initial height after content is loaded
                          setTimeout(autoResize, 10);
                          
                          // Auto-resize on input
                          textarea.addEventListener('input', autoResize);
                          
                          // Clear existing content and add textarea
                          verificationCell.innerHTML = '';
                          verificationCell.appendChild(textarea);
                          textarea.focus();
                          
                          console.log(`Added textarea to verification cell for row ${rowIndex + 1} with default text`);
                        } else {
                          // Remove textarea when checkbox is unchecked
                          const existingTextarea = verificationCell.querySelector('textarea');
                          if (existingTextarea) {
                            verificationCell.innerHTML = '';
                            console.log(`Removed textarea from verification cell for row ${rowIndex + 1}`);
                          }
                        }
                      } else {
                        console.log(`Could not find verification cell in row ${rowIndex + 1}`);
                    console.log('Available cells:', Array.from(cells).map((cell, idx) => `${idx}: "${cell.textContent.substring(0, 50)}..."`));
                      }
                    };
                    
                    checkboxCell.appendChild(checkbox);
                    row.appendChild(checkboxCell);
                    checkboxesAdded = true;
                    console.log(`Added checkbox to row ${rowIndex + 1} in fallback table`);
                  }
                });
              }
            }
          }
        });
        
        return checkboxesAdded;
      };

  // Make the test function available globally for debugging
  useEffect(() => {
    window.testCheckboxCreation = testCheckboxCreation;
    window.forceAddCheckboxes = forceAddCheckboxesNew;
    return () => {
      delete window.testCheckboxCreation;
      delete window.forceAddCheckboxes;
    };
  }, []);

  useEffect(() => {
    // Add custom CSS to hide "Powered by Flowise" text
    const style = document.createElement('style');
    style.textContent = `
      .flowise-powered-by {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Load the chatbot script
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
      Chatbot.init({
        chatflowid: "29de46a3-2f2f-4bf5-ad8d-9c6b7c24f355",
        apiHost: "https://workflow.simplifygenai.id",
        theme: {
          chatWindow: {
            footer: {
              textColor: '#303235',
              text: 'Powered by',
              company: 'Simplify AI',
              companyLink: 'https://simplifyai.com',
            },
          },
        },
      })
    `;
    document.body.appendChild(script);

    // Cleanup function to remove the script and style when component unmounts
    return () => {
      document.body.removeChild(script);
      document.head.removeChild(style);
    };
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // Function to extract text from PDF
  const extractTextFromPDF = async (arrayBuffer) => {
    const pdf = await getDocument(arrayBuffer).promise;
    const numPages = pdf.numPages;
    let pdfText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      pdfText += pageText + '\n';
    }

    return pdfText;
  };

  // Function to extract text from .docx
  const extractTextFromDocx = async (arrayBuffer) => {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from .docx:', error);
      throw new Error('Failed to extract text from Word document');
    }
  };

  const handleFileUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }

    // Check if file is PDF or .docx
    const isPDF = selectedFile.type === 'application/pdf';
    const isDocx = selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   selectedFile.name.toLowerCase().endsWith('.docx');

    if (!isPDF && !isDocx) {
      alert('Please select a PDF or Word (.docx) file.');
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          let documentText = '';

          // Extract text based on file type
          if (isPDF) {
            documentText = await extractTextFromPDF(arrayBuffer);
          } else if (isDocx) {
            documentText = await extractTextFromDocx(arrayBuffer);
          }

          console.log('Extracted Document Text:', documentText);

          // contract review openrouter
          //const flowiseUrl = 'https://workflow.simplifygenai.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';

          // contract review openrouter - TRIAL
          const flowiseUrl = 'https://workflow.simplifygenai.id/api/v1/prediction/44828cd5-c241-4fac-bc36-84531209cbd7';

          const response = await fetch(flowiseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: "Please summarize this contract.",
              chatId: generateContractReviewId(), // unik per pengguna/sesi
              uploads: [
                {
                  type: "file:full",
                  name: selectedFile.name,
                  data: documentText,  // ⚠️ pastikan sudah truncated jika panjang
                  mime: isPDF ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                }
              ]
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('Flowise Agent Response:', result);

          if (result && result.text) {
            // Set AI review content for display in AI Review card
            setAiReviewContent(result.text);
            
            // Add to review history with the API response
            const newReview = {
              id: reviewHistory.length + 1,
              contractName: selectedFile.name,
              reviewDate: new Date().toISOString().split('T')[0],
              status: 'Completed',
              reviewer: 'AI Assistant',
              summary: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
              fullReview: result.text
            };
            setReviewHistory([newReview, ...reviewHistory]);
          } else {
            // Set error message for AI Review card
            setAiReviewContent('Could not retrieve review from agent.');
            
            // Add error entry to review history
            const errorReview = {
              id: reviewHistory.length + 1,
              contractName: selectedFile.name,
              reviewDate: new Date().toISOString().split('T')[0],
              status: 'Failed',
              reviewer: 'AI Assistant',
              summary: 'Could not retrieve review from agent.',
              fullReview: 'Error: Could not process the contract review.'
            };
            setReviewHistory([errorReview, ...reviewHistory]);
          }
        } catch (error) {
          console.error('Error processing document or sending to agent:', error);
          alert('Error processing document or sending to agent.');
          
          // Set error message for AI Review card
          setAiReviewContent('Error: Could not process the contract review.');
          
          // Add error entry to review history
          const errorReview = {
            id: reviewHistory.length + 1,
            contractName: selectedFile.name,
            reviewDate: new Date().toISOString().split('T')[0],
            status: 'Failed',
            reviewer: 'AI Assistant',
            summary: 'Review failed due to API error',
            fullReview: 'Error: Could not process the contract review.'
          };
          setReviewHistory([errorReview, ...reviewHistory]);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file.');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error in file upload:', error);
      alert('Error in file upload.');
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge bg="success">{status}</Badge>;
      case 'Pending':
        return <Badge bg="warning" text="dark">{status}</Badge>;
      case 'In Progress':
        return <Badge bg="info">{status}</Badge>;
      case 'Failed':
        return <Badge bg="danger">{status}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // useEffect to add checkboxes after content is rendered
  useEffect(() => {
    if (aiReviewContent && aiReviewRef.current) {
      console.log('AI Review content updated, starting checkbox addition process...');

      // Try multiple times with different strategies
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryAddCheckboxes = () => {
        attempts++;
        console.log(`Attempt ${attempts} to add checkboxes...`);
        
        const success = forceAddCheckboxesNew();
        
        if (success) {
          console.log('Checkboxes added successfully!');
        } else if (attempts < maxAttempts) {
          console.log(`Attempt ${attempts} failed, retrying in ${attempts * 100}ms...`);
          setTimeout(tryAddCheckboxes, attempts * 100);
        } else {
          console.log('Max attempts reached. Checkboxes may not have been added.');
        }
      };

      // Start the process immediately and also after a delay
      tryAddCheckboxes();
      
      // Also try after a longer delay to catch any late-rendering content
      setTimeout(() => {
        console.log('Trying delayed checkbox addition...');
        forceAddCheckboxes();
      }, 1000);
      
      // And one more time after 2 seconds
      setTimeout(() => {
        console.log('Trying final checkbox addition...');
        forceAddCheckboxes();
      }, 2000);
    }
  }, [aiReviewContent]);

  // Add this useEffect to handle cell click for Input Verification of Amendments
  useEffect(() => {
    if (aiReviewContent && aiReviewRef.current) {
      const container = aiReviewRef.current;
      // Delegate click event to the container
      const handleCellClick = (e) => {
        // Only handle left click
        if (e.button !== 0) return;
        // Find the closest td
        const td = e.target.closest('td');
        if (!td) return;
        // Find the table and header row
        const table = td.closest('table');
        if (!table) return;
        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        const headerCells = headerRow.querySelectorAll('th');
        // Find the column index of the clicked cell
        const cellIndex = Array.from(td.parentElement.children).indexOf(td);
        // Find if this column is Input Verification of Amendments
        const headerText = headerCells[cellIndex]?.textContent?.toLowerCase() || '';
        if (
          headerText.includes('input verification') ||
          headerText.includes('verification of amendments') ||
          headerText.includes('verification')
        ) {
          // If the cell contains a textarea, use its value
          let cellValue = '';
          const textarea = td.querySelector('textarea');
          if (textarea && textarea.value && textarea.value.trim()) {
            cellValue = textarea.value.trim();
          } else if (td.innerText && td.innerText.trim()) {
            cellValue = td.innerText.trim();
          } else if (td.textContent && td.textContent.trim()) {
            cellValue = td.textContent.trim();
          } else {
            // Fallback: try to get value from a child node
            const child = td.querySelector('*');
            if (child && child.innerText && child.innerText.trim()) {
              cellValue = child.innerText.trim();
            }
          }
          console.log('Clicked Input Verification of Amendments cell. Modal popup suppressed.');
        }
      };
      container.addEventListener('mousedown', handleCellClick);
      return () => {
        container.removeEventListener('mousedown', handleCellClick);
      };
    }
  }, [aiReviewContent]);

  const handleSaveContractData = async () => {
    setIsSaving(true);
    try {
      if (!selectedFile) {
        alert('Please select a file first.');
        return;
      }

      // Allow both PDF and DOCX
      const isPDF = selectedFile.type === 'application/pdf';
      const isDocx = selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                     selectedFile.name.toLowerCase().endsWith('.docx');
      if (!isPDF && !isDocx) {
        alert('Please select a PDF or Word (.docx) file.');
        return;
      }

      // Generate unique contract_review_id
      const contract_review_id = generateContractReviewId();
      console.log('Generated contract_review_id:', contract_review_id);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          let documentText = '';
          if (isPDF) {
            // Extract text from PDF
            const pdf = await getDocument(arrayBuffer).promise;
            const numPages = pdf.numPages;
            for (let i = 1; i <= numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              documentText += pageText + '\n';
            }
          } else if (isDocx) {
            // Extract text from DOCX
            const result = await mammoth.extractRawText({ arrayBuffer });
            documentText = result.value;
          }

          console.log('Extracted Document Text:', documentText);

          // Save the original document text to the database with contract_review_id
          const { data, error } = await supabase
            .from('master_contract')
            .insert([
              {
                user_email: user?.email || 'unknown@example.com',
                user_role: user?.role || 'user',
                session_token: user?.sessionToken || 'no-token',
                original_pdf_text: documentText,
                contract_name: selectedFile.name,
                contract_review_id: contract_review_id,
                status: 'pending'
              }
            ]);

          if (error) {
            console.error('Error saving contract to database:', error);
            alert('Error saving contract to database: ' + error.message);
            return;
          }

          console.log('Contract saved to database:', data);

          // Fetch the contract back from the database and log the result
          try {
            const { data: fetchedContract, error: fetchError } = await supabase
              .from('master_contract')
              .select('*')
              .eq('user_email', user?.email || 'unknown@example.com')
              .eq('contract_review_id', contract_review_id);
            if (fetchError) {
              console.error('Error fetching contract after save:', fetchError);
            } else {
              console.log('Fetched contract after save:', fetchedContract);
            }
          } catch (fetchEx) {
            console.error('Exception fetching contract after save:', fetchEx);
          }

          // Extract data from table B
          const tableBData = extractTableBData();
          console.log('Extracted table B data:', tableBData);

          // Filter to only checked items
          const checkedTableBData = tableBData.filter(row => row.isChecked);
          console.log('Checked table B data (to be saved):', checkedTableBData);
          // Save only checked items to contract_updates table with contract_review_id
          await saveContractUpdatesToDatabase(checkedTableBData, documentText, contract_review_id);

          // Navigate to the contract-review-update route with user email and contract_review_id
          navigate('/contract-review-update', {
            state: {
              userEmail: user?.email || 'unknown@example.com',
              contractReviewId: contract_review_id
            }
          });
        } catch (error) {
          console.error('Error processing contract data:', error);
          alert('Error processing contract data.');
        } finally {
          setIsSaving(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file.');
        setIsSaving(false);
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error in save contract data:', error);
      alert('Error in save contract data.');
      setIsSaving(false);
    }
  };

  const extractTableBData = () => {
    const tableBData = [];
    
    try {
      console.log('Starting table B data extraction...');
      
      // Ensure aiReviewContent is rendered and available
      if (!aiReviewRef.current) {
        console.warn('aiReviewRef.current is null. AI review content might not be rendered yet. Retrying in a moment...');
        // You might want to add a small delay and re-run this function if this happens frequently
        return [];
      }

      let targetTable = null;
      const tablesInAiReview = aiReviewRef.current.querySelectorAll('table');
      console.log(`Found ${tablesInAiReview.length} tables within aiReviewRef.current`);

      // First, try to find Table B within the specific AI review content area
      for (let i = 0; i < tablesInAiReview.length; i++) {
        const table = tablesInAiReview[i];
        const tableText = table.textContent.toLowerCase();
        // console.log(`Table ${i + 1} in AI review content HTML (first 500 chars):`, table.innerHTML.substring(0, 500));
        
        const hasRelevantKeywords = tableText.includes('recommended legal amendments') || 
                                    tableText.includes('clause revisions') ||
                                    tableText.includes('b)') ||
                                    (tableText.includes('amendment') && tableText.includes('revision') && tableText.includes('clause'));
        const hasCheckboxes = table.querySelector('input[type="checkbox"]') !== null;
        const hasInputVerificationColumn = tableText.includes('input verification of amendments') || tableText.includes('verification');

        if (hasRelevantKeywords || hasCheckboxes || hasInputVerificationColumn) {
          console.log(`Identified potential table B at index ${i} within aiReviewRef.current based on keywords/checkboxes/input verification.`);
          targetTable = table;
          break; 
        }
      }

      // If not found in aiReviewRef, search globally for a table with checkboxes
      if (!targetTable) {
        console.log('Table B not found in AI review content area. Looking for tables with checkboxes anywhere in the document.');
        const allTables = document.querySelectorAll('table');
        console.log(`Found ${allTables.length} tables in the entire document.`);

        for (let i = 0; i < allTables.length; i++) {
          const table = allTables[i];
          const hasCheckboxes = table.querySelector('input[type="checkbox"]') !== null;
          const tableText = table.textContent.toLowerCase();
          // console.log(`Global Table ${i + 1} HTML (first 500 chars):`, table.innerHTML.substring(0, 500));

          if (hasCheckboxes) {
            console.log(`Identified potential table B at global index ${i} due to presence of checkboxes.`);
            targetTable = table;
            break;
          }
        }
      }

      if (targetTable) {
        extractDataFromTable(targetTable, tableBData, 'identified');
      } else {
        console.log('No suitable table identified as Table B.');
      }
      
      console.log(`Total rows extracted from table B: ${tableBData.length}`);
      console.log('Final table B data:', tableBData);
      
      if (tableBData.length === 0) {
        console.warn('No data was extracted for Table B. Please ensure the AI review content correctly renders Table B with the expected structure and input fields.');
      }
      
      return tableBData;
    } catch (error) {
      console.error('Fatal error during table B data extraction:', error);
      return [];
    }
  };

  const extractDataFromTable = (table, tableBData, tableIdentifier = '') => {
    // Get header cells to map columns by their text
    const headerCells = Array.from(table.querySelectorAll('thead th'));
    const headers = headerCells.map(th => th.textContent.toLowerCase().trim());
    console.log(`Table ${tableIdentifier} Headers:`, headers);

    // Define column mapping with more robust fallbacks
    const colMap = {
      contractualReference: headers.findIndex(h => h.includes('contractual reference')),
      recommendedLegalAmendment: headers.findIndex(h => h.includes('recommended legal amendment')),
      originalClause: headers.findIndex(h => h.includes('original clause')),
      inputVerificationOfAmendments: headers.findIndex(h => h.includes('input verification of amendments') || h.includes('verification')),
      revisedClause: headers.findIndex(h => h.includes('revised clause') || h.includes('formal legal language') || h.includes('recommended amendment'))
    };

    // Apply fallback indices if specific headers are not found
    colMap.contractualReference = colMap.contractualReference !== -1 ? colMap.contractualReference : 0;
    colMap.recommendedLegalAmendment = colMap.recommendedLegalAmendment !== -1 ? colMap.recommendedLegalAmendment : 1;
    colMap.originalClause = colMap.originalClause !== -1 ? colMap.originalClause : 2;
    colMap.inputVerificationOfAmendments = colMap.inputVerificationOfAmendments !== -1 ? colMap.inputVerificationOfAmendments : 3;
    colMap.revisedClause = colMap.revisedClause !== -1 ? colMap.revisedClause : 4; 
    
    console.log(`Final Column Mapping for table ${tableIdentifier}:`, colMap);

    // Get all rows in the table, excluding header rows
    // Look for rows within tbody first, then fallback to all tr elements directly under the table
    let rows = Array.from(table.querySelectorAll('tbody tr'));
    if (rows.length === 0) {
      console.log(`No tbody rows found for table ${tableIdentifier}, trying direct tr children.`);
      rows = Array.from(table.querySelectorAll(':scope > tr')).filter(row => row.parentElement.tagName !== 'THEAD');
    }
    console.log(`Found ${rows.length} data rows for table ${tableIdentifier}.`);
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');
      // Ensure the row has a checkbox if we are specifically looking for checked rows (though we want all in B)
      const hasCheckbox = row.querySelector('input[type="checkbox"]') !== null;
      const checkboxChecked = row.querySelector('input[type="checkbox"]:checked') !== null;

      // Only process rows that have enough cells for our required data, and optionally a checkbox
      const minCellsRequired = Math.max(
        colMap.contractualReference,
        colMap.recommendedLegalAmendment,
        colMap.originalClause,
        colMap.inputVerificationOfAmendments,
        colMap.revisedClause
      ) + 1;

      if (cells.length >= minCellsRequired) {
        const contractualReference = cells[colMap.contractualReference]?.textContent?.trim() || '';
        const recommendedLegalAmendment = cells[colMap.recommendedLegalAmendment]?.textContent?.trim() || '';
        const originalClause = cells[colMap.originalClause]?.textContent?.trim() || '';
        
        let inputVerification = '';
        const inputVerificationCell = cells[colMap.inputVerificationOfAmendments];

        if (inputVerificationCell) {
          const textarea = inputVerificationCell.querySelector('textarea');
          if (textarea) {
            inputVerification = textarea.value.trim();
            // console.log(`Found textarea value for row ${rowIndex + 1}: ${inputVerification.substring(0, 50)}...`);
          } else {
            inputVerification = inputVerificationCell.textContent.trim();
            // console.log(`Using cell text for row ${rowIndex + 1}: ${inputVerification.substring(0, 50)}...`);
          }
        }

        // Get default text for input verification from revised clause if available and input verification is empty
        if (!inputVerification && colMap.revisedClause !== -1) {
          const revisedClauseText = cells[colMap.revisedClause]?.textContent?.trim() || '';
          if (revisedClauseText) {
            inputVerification = revisedClauseText;
            // console.log(`Auto-filled Input Verification for row ${rowIndex + 1} from Revised Clause: ${inputVerification.substring(0, 50)}...`);
          }
        }
        
        // Only add if we have meaningful data from the main columns OR if the row has a checked checkbox
        if (contractualReference || recommendedLegalAmendment || originalClause || checkboxChecked) {
          const rowData = {
            contractualReference,
            recommendedLegalAmendment,
            originalClause,
            inputVerification,
            // Add a flag to indicate if this row was checked by the user
            isChecked: checkboxChecked
          };
          
          tableBData.push(rowData);
          console.log(`Extracted row ${rowIndex + 1} from table ${tableIdentifier}:`, rowData);
        } else {
          console.log(`Skipping row ${rowIndex + 1} in table ${tableIdentifier} - no meaningful data in core columns or checked checkbox.`);
        }
      } else {
        console.log(`Skipping row ${rowIndex + 1} in table ${tableIdentifier} - insufficient cells (${cells.length}). Expected at least ${minCellsRequired} cells.`);
      }
    });
  };

  const saveContractUpdatesToDatabase = async (tableBData, pdfText, contract_review_id) => {
    try {
      console.log('Starting to save contract updates to database...');
      console.log('Table B data received:', tableBData);
      console.log('PDF text length:', pdfText?.length || 0);
      
      if (!tableBData || tableBData.length === 0) {
        console.log('No table B data to save');
        alert('No table B data found to save. Please make sure the AI review has completed and table B is visible.');
        return;
      }

      if (!pdfText) {
        console.log('No PDF text provided');
        alert('No PDF text available for saving.');
        return;
      }

      // First, check if the contract_updates table exists
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from('contract_updates')
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.error('Table check error:', tableError);
          if (tableError.code === '42P01') { // Table doesn't exist
            alert('The contract_updates table does not exist in your Supabase database. Please create it first using the SQL script provided.');
            return;
          }
        }
        console.log('Table check successful, contract_updates table exists');
      } catch (checkError) {
        console.error('Error checking table existence:', checkError);
        alert('Error checking database table. Please ensure the contract_updates table exists.');
        return;
      }

      // Prepare data for insertion
      const insertData = tableBData.map((row, index) => {
        const dataRow = {
          user_email: user?.email || 'unknown@example.com',
          user_role: user?.role || 'user',
          session_token: user?.sessionToken || 'no-token',
          original_pdf_text: pdfText,
          contractual_reference: row.contractualReference || '',
          recommended_legal_amendment: row.recommendedLegalAmendment || '',
          original_clause: row.originalClause || '',
          input_verification_of_amendments: row.inputVerification || '',
          contract_name: selectedFile?.name || 'unknown_contract',
          contract_review_id: contract_review_id,
          status: 'pending'
        };
        
        console.log(`Prepared row ${index + 1} for insertion:`, dataRow);
        return dataRow;
      });

      console.log('Prepared insert data:', insertData);

      // Insert data into contract_updates table
      const { data, error } = await supabase
        .from('contract_updates')
        .insert(insertData);

      if (error) {
        console.error('Error saving contract updates to database:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert('Error saving contract updates to database: ' + error.message);
        return;
      }

      console.log('Contract updates saved to database successfully:', data);
    } catch (error) {
      console.error('Error in saveContractUpdatesToDatabase:', error);
      console.error('Error stack:', error.stack);
      alert('Error saving contract updates: ' + error.message);
    }
  };

  // Function to generate the revised contract draft (live preview)
  const generateRevisedContractDraft = async () => {
    if (!originalPdfText) return;
    setIsGeneratingRevised(true);
    try {
      // Extract Table B data (current state)
      const tableBData = extractTableBData();
      if (!tableBData || tableBData.length === 0) {
        setRevisedContract('');
        setIsGeneratingRevised(false);
        return;
      }
      // Format updates for the prompt
      const updatesText = tableBData.map((update, i) => {
        return `Update ${i + 1}:\n- Contractual Reference: ${update.contractualReference || 'N/A'}\n- Original Clause: ${update.originalClause || 'N/A'}\n- Recommended Legal Amendment: ${update.recommendedLegalAmendment || 'N/A'}\n- Input Verification: ${update.inputVerification || 'N/A'}\n`;
      }).join('\n');
      const prompt = `\nHere is the original employment contract:\n\n${originalPdfText}\n\nBelow are the contract updates to apply:\n\n${updatesText}\n\nPlease generate the full revised contract after applying these updates. Keep the structure, legal formatting, and numbering format and structure. Make sure to incorporate all the Input Verification into the appropriate sections of the contract. Adjust the article numbering so that the numbering is sequential, starting from Article 1 and continuing in proper order.\n`;
      // Call the API
      const response = await fetch(SIMPLIFY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          chatId: generateContractReviewId(),
          uploads: []
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      let output = result.text || result.output || '[No response from Simplify]';
      // Extract text between the markers if present
      const startMarker = '=== START OF NEW REVISED CONTRACT ===';
      const endMarker = '=== END OF NEW REVISED CONTRACT ==';
      const startIdx = output.indexOf(startMarker);
      const endIdx = output.indexOf(endMarker);
      let between = '';
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        between = output.substring(startIdx + startMarker.length, endIdx).trim();
      } else if (startIdx !== -1) {
        between = output.substring(startIdx + startMarker.length).trim();
      } else {
        between = output;
      }
      setRevisedContract(between);
      setEditableRevisedContract(between);
    } catch (error) {
      setRevisedContract('[Error generating revised contract draft]');
    } finally {
      setIsGeneratingRevised(false);
    }
  };

  // When originalPdfText or Table B changes, regenerate the draft
  useEffect(() => {
    if (originalPdfText) {
      generateRevisedContractDraft();
    }
    // eslint-disable-next-line
  }, [originalPdfText]);

  return (
    <React.Fragment>
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Contract Review System</Card.Title>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={onConductReview}>
                 <Row>
                  <Col md={6} sm={12}>
                    <Form.Group controlId="formFile" className="mb-3">
                      <Form.Label>Upload Agreement</Form.Label>
                      <Form.Control 
                        type="file" 
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange} 
                        disabled={isProcessing} 
                      />
                      <Form.Text className="text-muted">
                        Upload a PDF or Word (.docx) contract file for AI-powered review and analysis.
                      </Form.Text>
                    </Form.Group>
                    <Form.Group controlId="reviewLanguage" className="mb-3">
                      <Form.Label>Select Language Review Mode</Form.Label>
                      <Form.Select value={reviewLanguage} onChange={handleReviewLanguageChange} disabled={isProcessing}>
                        <option value="English">English</option>
                        <option value="Indonesian">Indonesian</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group controlId="partyPositioning" className="mb-3">
                      <Form.Label>Party Positioning</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter party positioning"
                        value={partyPositioning}
                        onChange={handlePartyPositioningChange}
                        disabled={isProcessing}
                      />
                    </Form.Group>
                    <Form.Group controlId="riskPositioning" className="mb-3">
                      <Form.Label>Risk Positioning</Form.Label>
                      <Form.Select
                        value={riskPositioning}
                        onChange={handleRiskPositioningChange}
                        disabled={isProcessing}
                      >
                        <option value="Unilateral">Unilateral</option>
                        <option value="Mutual">Mutual</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6} sm={12}>
                    <Form.Group controlId="underlyingAgreementFile" className="mb-3">
                      <Form.Label>Underlying Agreement</Form.Label>
                      <Form.Control
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleUnderlyingAgreementFileChange}
                        multiple
                        disabled={isProcessing || underlyingAgreementFiles.length >= 10}
                      />
                      <Form.Text className="text-muted">
                        (Optional) Upload up to 10 underlying agreement documents for additional context.
                      </Form.Text>
                      {underlyingAgreementFiles && underlyingAgreementFiles.length > 0 && (
                        <ul style={{marginTop: '10px', paddingLeft: 0, listStyle: 'none'}}>
                          {underlyingAgreementFiles.map((file, idx) => (
                            <li key={idx} style={{display: 'flex', alignItems: 'center', marginBottom: 4}}>
                              <span style={{flex: 1, wordBreak: 'break-all'}}>{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveUnderlyingAgreementFile(idx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc3545',
                                  cursor: 'pointer',
                                  marginLeft: 8,
                                  fontSize: 18
                                }}
                                aria-label={`Remove ${file.name}`}
                              >
                                {/* Use react-icons/fa trash icon if available */}
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'inline',verticalAlign:'middle'}}><line x1="4.5" y1="4.5" x2="11.5" y2="11.5" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/><line x1="11.5" y1="4.5" x2="4.5" y2="11.5" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/></svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
                <Button variant="primary" type="submit" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Reviewing Contract...
                    </>
                  ) : (
                    'Conduct Review'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Review Data card hidden as requested
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Review Data</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Contract Name</th>
                    <th>Review Date</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Summary</th>
                    <th>Full Review</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewHistory.map((review) => (
                    <tr key={review.id}>
                      <td>{review.contractName}</td>
                      <td>{review.reviewDate}</td>
                      <td>{getStatusBadge(review.status)}</td>
                      <td>{review.reviewer}</td>
                      <td>{review.summary}</td>
                      <td>
                        {review.fullReview && review.fullReview.length > 100 ? (
                          <div>
                            <div style={{ maxHeight: '100px', overflow: 'hidden' }}>
                              {review.fullReview.substring(0, 100)}...
                            </div>
                            <Button 
                              variant="link" 
                              size="sm" 
                              onClick={() => {
                                // You can implement a modal or expandable view here
                                alert(review.fullReview);
                              }}
                            >
                              View Full Review
                            </Button>
                          </div>
                        ) : (
                          <div>{review.fullReview}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      */}

      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">AI Review</Card.Title>
            </Card.Header>
            <Card.Body>
              {aiReviewContent ? (
                <div className="ai-review-content" ref={aiReviewRef}>
                  <div dangerouslySetInnerHTML={{ __html: aiReviewContent }} />
                </div>
              ) : (
                <p className="text-muted">AI Review content will appear here after processing a contract.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Debug section - only show when AI content is available */}
      {/* Debug Tools card - HIDDEN */}
      {/*
      {aiReviewContent && (
        <Row>
          <Col xl={12} xxl={12}>
            <Card>
              <Card.Header>
                <Card.Title as="h5">Debug Tools</Card.Title>
              </Card.Header>
              <Card.Body>
                <Button 
                  variant="info" 
                  size="sm"
                  onClick={testCheckboxCreation}
                  style={{ marginRight: '10px' }}
                >
                  Test Checkbox Creation
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => {
                    console.log('=== MANUAL CHECKBOX TEST ===');
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                    console.log(`Found ${checkboxes.length} checkboxes on page`);
                    checkboxes.forEach((checkbox, index) => {
                      console.log(`Checkbox ${index}:`, checkbox.id, checkbox.checked);
                      // Test clicking the checkbox
                      checkbox.click();
                      setTimeout(() => {
                        console.log(`Checkbox ${index} after click:`, checkbox.checked);
                      }, 100);
                    });
                  }}
                >
                  Test Checkbox Clicks
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      */}

      <Row>
        <Col xl={12} xxl={12} className="text-start">
          <Button 
            variant="success" 
            size="lg"
            onClick={handleSaveContractData}
            disabled={isSaving}
            style={{ marginTop: '20px', marginBottom: '20px', marginRight: '10px' }}
          >
            {isSaving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Saving Contract Data...
              </>
            ) : (
              'Next Step'
            )}
          </Button>
          {/* COPY PASTE & SAVE TO DATABASE buttons - HIDDEN */}
          {/*
          <Button
            variant="primary"
            size="lg"
            style={{ marginTop: '20px', marginBottom: '20px', marginRight: '10px' }}
            onClick={() => {
              const textarea = document.getElementById('text_of_new_contract_draft');
              if (textarea) {
                textarea.select();
                document.execCommand('copy');
                // Paste the copied text into the Live Preview textarea (update state)
                setEditableRevisedContract(textarea.value);
              }
            }}
          >
            COPY PASTE
          </Button>
          <Button
            variant="warning"
            size="lg"
            style={{ marginTop: '20px', marginBottom: '20px' }}
            onClick={async () => {
              // Save the current content of the Live Preview textarea to the database
              if (!selectedFile) {
                alert('No contract file selected.');
                return;
              }
              const contractName = selectedFile.name;
              try {
                // Find the contract in master_contract by contract_name and update revised_contract_text
                const { error } = await supabase
                  .from('master_contract')
                  .update({ revised_contract_text: editableRevisedContract })
                  .eq('contract_name', contractName);
                if (error) {
                  alert('Failed to save to database: ' + error.message);
                } else {
                  alert('Revised contract draft saved to database!');
                }
              } catch (err) {
                alert('Error saving to database: ' + err.message);
              }
            }}
          >
            SAVE TO DATABASE
          </Button>
          */}
        </Col>
      </Row>

      <Row>
        <Col xl={12} xxl={12}>
          {/* Live Preview: Fully Revised Contract Draft card - HIDDEN */}
          {/*
          <Card>
            <Card.Header>
              <Card.Title as="h5">Live Preview: Fully Revised Contract Draft</Card.Title>
            </Card.Header>
            <Card.Body>
              {isGeneratingRevised ? (
                <div className="text-center">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Generating...</span>
                  </Spinner>
                  <p className="mt-2">Generating revised contract draft...</p>
                </div>
              ) : (
                <textarea
                  id="text_of_new_contract_draft"
                  className="form-control"
                  style={{ minHeight: '300px', maxHeight: '400px', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', resize: 'vertical' }}
                  value={editableRevisedContract}
                  onChange={e => setEditableRevisedContract(e.target.value)}
                  placeholder="The revised contract draft will appear here after you upload a contract and make changes."
                />
              )}
            </Card.Body>
          </Card>
          */}
        </Col>
      </Row>

      <Modal show={showVerificationModal} onHide={() => setShowVerificationModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Input Verification of Amendments</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <textarea
            className="form-control"
            style={{ minHeight: '120px' }}
            value={verificationModalValue}
            onChange={e => {
              setVerificationModalValue(e.target.value);
            }}
            autoFocus
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVerificationModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => {
            // Update the cell only when Save Changes is clicked
            if (verificationModalCell) {
              // Save the old value before updating
              const oldValue = verificationModalCell.textContent;
              verificationModalCell.textContent = verificationModalValue;
              // Replace only the first exact occurrence of the previous text in the textarea
              setEditableRevisedContract(prev => {
                // Use the previous value of the cell (before change)
                const previousText = oldValue;
                if (!previousText || !prev.includes(previousText)) return prev;
                // Replace only the first exact match
                const idx = prev.indexOf(previousText);
                if (idx === -1) return prev;
                return prev.slice(0, idx) + verificationModalValue + prev.slice(idx + previousText.length);
              });
            }
            setShowVerificationModal(false);
          }}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </React.Fragment>
  );
};

export default ContractReview; 