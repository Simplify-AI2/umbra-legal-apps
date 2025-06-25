import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const ContractReviewUpdateContract = () => {
  return (
    <Row className="justify-content-center mt-5">
      <Col xl={8} xxl={8}>
        <Card>
          <Card.Header>
            <Card.Title as="h4">Contract Review Update Contract</Card.Title>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <form>
                  <div className="mb-3">
                    <label htmlFor="contractFile" className="form-label">Upload Contract for Review</label>
                    <input type="file" className="form-control" id="contractFile" name="contractFile" />
                  </div>
                </form>
              </Col>
              <Col md={6}>
                <form>
                  <div className="mb-3">
                    <label htmlFor="underlyingAgreement" className="form-label">Underlying Agreement</label>
                    <input type="file" className="form-control" id="underlyingAgreement" name="underlyingAgreement" />
                  </div>
                </form>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ContractReviewUpdateContract; 