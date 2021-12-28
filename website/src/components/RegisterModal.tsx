import React, { FunctionComponent } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  InputProps,
  CheckboxProps,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
  Checkbox
} from '@chakra-ui/react';
import { Formik, Form, Field, FormikState } from 'formik';
import 'whatwg-fetch';
import { IoLogoGoogle } from 'react-icons/io5';
import { getConfig } from '../lib/config';

interface Values {
  realName: string;
  email: string;
  password: string;
  passwordAgain: string;
  nick: string;
  tos: boolean;
}

interface InputRenderProps {
  field: InputProps;
  form: FormikState<Values>;
}

interface CheckboxRenderProps {
  field: CheckboxProps;
  form: FormikState<Values>;
}

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterModal: FunctionComponent<RegisterModalProps> = ({ isOpen, onClose }: RegisterModalProps) => {
  const validateRealName = (value: string) => {
    if (!value) {
      return 'Name is required';
    } else if (value.length < 6) {
      return 'Name is too short';
    }
  };

  const validateEmail = (value: string) => {
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
      return 'Invalid email address';
    }
  };

  const validatePassword = (value: string) => {
    if (value.length < 6) {
      return 'Password is too short';
    }
  };

  const validateTos = (value: boolean) => {
    if (!value) {
      return 'You must agree to the terms of service';
    }
  };

  const googleRedirect = () => {
    window.location.pathname = '/auth/google';
  };

  const extRegister = getConfig().auth.google ? (
    <Box mt="2rem">
      <Box>Register with an existing account:</Box>
      <Button mt="1rem" onClick={googleRedirect} leftIcon={<IoLogoGoogle />}>
        Google Account
      </Button>
    </Box>
  ) : null;

  const form = (
    <Formik
      initialValues={{ realName: '', email: '', password: '', passwordAgain: '', nick: '', tos: false }}
      onSubmit={(values, actions) => {
        fetch('/api/v1/register', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(values),
          credentials: 'include'
        })
          .then(response => response.json())
          .then(data => {
            if (data.success === true) {
              // Server has set the cookie, just redirect
              window.location.pathname = '/app/';
            } else {
              actions.setErrors(data.errors);
            }
          });
      }}
    >
      {formProps => (
        <Form>
          <Field name="realName" validate={validateRealName}>
            {({ field, form }: InputRenderProps) => (
              <FormControl mt="1rem" isInvalid={!!(form.errors.realName && form.touched.realName)}>
                <FormLabel htmlFor="realName">Your Name</FormLabel>
                <Input {...field} id="realName" placeholder="name" />
                <FormErrorMessage>{form.errors.realName}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="email" validate={validateEmail}>
            {({ field, form }: InputRenderProps) => (
              <FormControl mt="1rem" isInvalid={!!(form.errors.email && form.touched.email)}>
                <FormLabel htmlFor="email">Email Address</FormLabel>
                <Input {...field} id="email" placeholder="email" />
                <FormErrorMessage>{form.errors.email}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="password" validate={validatePassword}>
            {({ field, form }: InputRenderProps) => (
              <FormControl mt="1rem" isInvalid={!!(form.errors.password && form.touched.password)}>
                <FormLabel htmlFor="password">Password</FormLabel>
                <Input {...field} id="password" placeholder="password" />
                <FormErrorMessage>{form.errors.password}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="passwordAgain" validate={validatePassword}>
            {({ field, form }: InputRenderProps) => (
              <FormControl mt="1rem" isInvalid={!!(form.errors.passwordAgain && form.touched.passwordAgain)}>
                <FormLabel htmlFor="passwordAgain">Password (again)</FormLabel>
                <Input {...field} id="passwordAgain" placeholder="passwordAgain" />
                <FormErrorMessage>{form.errors.passwordAgain}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="nick" validate={validatePassword}>
            {({ field, form }: InputRenderProps) => (
              <FormControl mt="1rem" isInvalid={!!(form.errors.nick && form.touched.nick)}>
                <FormLabel htmlFor="nick">Nickname</FormLabel>
                <Input {...field} id="nick" placeholder="nick" />
                <FormErrorMessage>{form.errors.nick}</FormErrorMessage>
              </FormControl>
            )}
          </Field>
          <Field name="tos" validate={validateTos}>
            {({ field, form }: CheckboxRenderProps) => (
              <FormControl mt="1rem" isInvalid={!!(form.errors.tos && form.touched.tos)}>
                <FormLabel htmlFor="tos">I agree MAS Terms of Service</FormLabel>
                <Checkbox {...field} id="tos" placeholder="tos" />
                <FormErrorMessage>{form.errors.tos}</FormErrorMessage>
              </FormControl>
            )}
          </Field>

          <Button mt={4} colorScheme="teal" isLoading={formProps.isSubmitting} type="submit">
            Register
          </Button>
        </Form>
      )}
    </Formik>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Register</ModalHeader>
        <ModalCloseButton />
        <ModalBody px="2rem" py="1rem">
          {form}
          {extRegister}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
