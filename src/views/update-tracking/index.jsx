import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

const UpdateTracking = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        
        if (!user?.email) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // Fetch all contracts from master_contract table for the current user
        const { data: contracts, error: contractsError } = await supabase
          .from('master_contract')
          .select('*')
          .eq('user_email', user.email)
          .order('created_at', { ascending: false });

        if (contractsError) {
          console.error('Error fetching contracts:', contractsError);
          setError('Error fetching contracts: ' + contractsError.message);
        } else {
          setContracts(contracts || []);
        }
      } catch (error) {
        console.error('Error in fetchContracts:', error);
        setError('Error loading contracts: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [user]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge bg="success">{status}</Badge>;
      case 'pending':
        return <Badge bg="warning" text="dark">{status}</Badge>;
      case 'in_progress':
        return <Badge bg="info">{status}</Badge>;
      case 'rejected':
        return <Badge bg="danger">{status}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleViewChanges = (contractReviewId) => {
    navigate('/view-file-changes', {
      state: {
        contractReviewId: contractReviewId
      }
    });
  };

  if (loading) {
    return (
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Body className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2">Loading contracts...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  if (error) {
    return (
      <Row>
        <Col xl={12} xxl={12}>
          <Alert variant="danger">
            <Alert.Heading>Error</Alert.Heading>
            <p>{error}</p>
          </Alert>
        </Col>
      </Row>
    );
  }

  return (
    <React.Fragment>
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">File Updates</Card.Title>
            </Card.Header>
            <Card.Body>
              {contracts.length === 0 ? (
                <Alert variant="info">
                  <Alert.Heading>No Contracts Found</Alert.Heading>
                  <p>
                    You haven't created any contracts yet. 
                    <br />
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => navigate('/contract-review')}
                      className="mt-2"
                    >
                      Go to Contract Review
                    </Button>
                  </p>
                </Alert>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Contract Name</th>
                      <th>Review ID</th>
                      <th>User Email</th>
                      <th>Review Date</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => (
                      <tr key={contract.id}>
                        <td>{contract.contract_name || 'N/A'}</td>
                        <td>
                          <code style={{ fontSize: '0.8em' }}>
                            {contract.contract_review_id || 'N/A'}
                          </code>
                        </td>
                        <td>{contract.user_email || 'N/A'}</td>
                        <td>{contract.review_date ? new Date(contract.review_date).toLocaleDateString() : 'N/A'}</td>
                        <td>{new Date(contract.created_at).toLocaleDateString()}</td>
                        <td>{contract.updated_at ? new Date(contract.updated_at).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewChanges(contract.contract_review_id)}
                            disabled={!contract.contract_review_id}
                          >
                            View Changes
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </React.Fragment>
  );
};

export default UpdateTracking; 